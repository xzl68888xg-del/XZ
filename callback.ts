import { FastifyInstance } from 'fastify';
import { pool } from '../db';
import { AccountRecordType } from '@sys/shared';

export default async function walletGatewayRoutes(fastify: FastifyInstance) {
  fastify.post('/api/callback/v1/wallet', async (request, reply) => {
    const { userId, action, amount, transferId } = request.body as {
      userId: number; action: 'DEBIT' | 'CREDIT'; amount: number; transferId: string;
    };

    // 1. 严格的协议层参数拦截
    if (!userId || !action || amount <= 0 || !transferId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: '核心协议参数校验失败' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 【安全防御 1】设置锁等待超时为 3000 毫秒，防止极端并发死锁锁死连接池
      await client.query("SET LOCAL lock_timeout = '3000ms'");

      // 2. 强一致性行级排他锁，拦截并发冲正与双花
      const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'USER_NOT_FOUND', message: '中台账户不存在' });
      }

      // 【安全防御 2】财务级精度对齐：将 DB 字符串转为 BigInt 整数（放大 10000 倍进行无损计算）
      const balanceBeforeBI = BigInt(Math.round(Number(userRes.rows[0].balance) * 10000));
      const amountBI = BigInt(Math.round(amount * 10000));
      let balanceAfterBI = balanceBeforeBI;
      let recordType: AccountRecordType;

      if (action === 'DEBIT') {
        if (balanceBeforeBI < amountBI) {
          await client.query('ROLLBACK');
          return reply.status(400).send({ error: 'INSUFFICIENT_BALANCE', message: '可用配额不足' });
        }
        balanceAfterBI = balanceBeforeBI - amountBI;
        recordType = AccountRecordType.BET;
      } else {
        balanceAfterBI = balanceBeforeBI + amountBI;
        recordType = AccountRecordType.WIN;
      }

      // 3. 严格的网关幂等性拦截（防止外部通道重试导致账目重扣）
      const duplicateCheck = await client.query('SELECT id FROM account_records WHERE order_no = $1 LIMIT 1', [transferId]);
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return reply.send({ status: 'SUCCESS', balance: Number(balanceBeforeBI) / 10000 });
      }

      // 4. 将 BigInt 还原为 DECIMAL 字符串安全落库
      const balanceAfterFinal = (Number(balanceAfterBI) / 10000).toFixed(4);
      const balanceBeforeFinal = (Number(balanceBeforeBI) / 10000).toFixed(4);
      const dbAmount = (action === 'DEBIT' ? -amount : amount).toFixed(4);

      await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfterFinal, userId]);
      await client.query(
        `INSERT INTO account_records (user_id, order_no, type, amount, balance_before, balance_after, remark) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, transferId, recordType, dbAmount, balanceBeforeFinal, balanceAfterFinal, `集群算力分发流转单号:${transferId}`]
      );

      await client.query('COMMIT');
      return reply.send({ status: 'SUCCESS', balance: Number(balanceAfterFinal), timestamp: Date.now() });
    } catch (error: any) {
      await client.query('ROLLBACK');
      // 如果触发了锁超时错误 (PostgreSQL 错误码 55P03)，返回通俗易懂的 429
      if (error.code === '55P03') {
        return reply.status(429).send({ error: 'LOCK_TIMEOUT', message: '中台算力分配队列拥堵，请稍后重试' });
      }
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: error.message });
    } finally {
      client.release(); // 释放连接回连接池，彻底防止内存泄漏
    }
  });
}
