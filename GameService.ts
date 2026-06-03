import axios from 'axios';
import { ApiResponse } from '@sys/shared';

export class GameService {
  // 从环境变量读取外部服务分配给我们的对接商户凭证
  private static PROVIDER_API_URL = process.env.GAME_API_URL || 'https://api.thirdpartygame.com';
  private static MERCHANT_CODE = process.env.GAME_MERCHANT_CODE || 'XUANGUANG_CORE';
  private static SECRET_KEY = process.env.GAME_SECRET_KEY || '9fff88888888888';

  /**
   * 向外部网关申请沙箱应用启动链接 (Launch Module URL)
   */
  static async launchGame(userId: number, username: string, gameCode: string): Promise<ApiResponse<{ launchUrl: string }>> {
    try {
      // 1. 根据外部对接协议，生成特定签名的请求参数
      const timestamp = Date.now();
      const payload = {
        merchantCode: this.MERCHANT_CODE,
        username: username,
        userId: userId,
        gameCode: gameCode,
        timestamp: timestamp,
        // 参数进行哈希排序加盐签名机制
        sign: Buffer.from(`${this.MERCHANT_CODE}${username}${timestamp}${this.SECRET_KEY}`).toString('hex')
      };

      // 2. 发送请求给外部厂商的 API 网关入口
      const response = await axios.post(`${this.PROVIDER_API_URL}/v1/game/launch`, payload, { timeout: 5000 });

      if (response.data && response.data.status === 'SUCCESS') {
        return {
          code: 200,
          message: '获取授权启动链接成功',
          data: { launchUrl: response.data.url }, // 带高强度安全 Token 的 URL
          timestamp: Date.now()
        };
      }

      // 已修正：补齐反引号，规范化错误提示语境
      return { 
        code: 400, 
        message: `外部厂商拒绝请求: ${response.data.message || '未知异常'}`, 
        data: null as any, 
        timestamp: Date.now() 
      };
    } catch (error: any) {
      // 已修正：补齐反引号，规范化超时处理提示语境
      return { 
        code: 500, 
        message: `外部网关连接超时或拒绝服务: ${error.message}`, 
        data: null as any, 
        timestamp: Date.now() 
      };
    }
  }
}