import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Modal, Upload, Space, Tag, Select, message } from 'antd';
import { UploadOutlined, CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import http from '../utils/http'; // 使用上一阶段封装的带 Token 的 Axios 实例

interface GameItem {
  gameCode: string;
  gameName: string;
  category: 'SLOT' | 'LIVE' | 'CHESS';
  provider: string;
  status: number;
}

export const GameManager: React.FC = () => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importData, setImportData] = useState<GameItem[]>([]);
  const [filterProvider, setFilterProvider] = useState<string>('ALL');

  // 1. 获取已导入的模块/接口列表
  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/api/admin/games/list?provider=${filterProvider}`);
      if (res.data.code === 200) {
        setGames(res.data.data);
      }
    } catch (err) {
      // 拦截器自动处理报错提示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [filterProvider]);

  // 2. 前端解析三方数据 Excel 矩阵
  const handleExcelParse = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ab = e.target?.result;
        const workbook = XLSX.read(ab, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

        // 规范化 Excel 列名：[应用代码, 应用名称, 应用分类, 厂商标识]
        const formatted: GameItem[] = rawData.map((row) => ({
          gameCode: String(row['应用代码'] || row['游戏代码'] || '').trim(),
          gameName: String(row['应用名称'] || row['游戏名称'] || '').trim(),
          category: (row['应用分类'] || row['游戏分类']) as any, 
          provider: String(row['厂商标识'] || '').toUpperCase().trim(),
          status: 1, // 默认就绪启用
        }));

        if (formatted.some(item => !item.gameCode || !item.gameName || !item.provider)) {
          return message.error('解析失败：Excel 内部存在空单元格，请检查核心字段！');
        }

        setImportData(formatted);
        message.success(`成功解析 ${formatted.length} 条数据，请核对后入库。`);
      } catch (err) {
        message.error('Excel 解析异常，请下载标准厂商规范模板。');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // 3. 一键提交批量数据到后端网关
  const submitBulkGames = async () => {
    if (importData.length === 0) return;
    setLoading(true);
    try {
      const res = await http.post('/api/admin/games/bulk-import', { games: importData });
      if (res.data.code === 200) {
        message.success(`恭喜！成功一键导入/更新 ${importData.length} 条大厅接口数据。`);
        setIsModalOpen(false);
        setImportData([]);
        fetchGames(); // 刷新列表
      }
    } catch (err) {
      // 拦截器自动处理报错
    } finally {
      setLoading(false);
    }
  };

  // AntD 表格列定义
  const columns = [
    { title: '提供商/厂商', dataIndex: 'provider', key: 'provider', render: (text: string) => <Tag color="purple">{text}</Tag> },
    { title: '识别代码 (Code)', dataIndex: 'gameCode', key: 'gameCode' },
    { title: '名称', dataIndex: 'gameName', key: 'gameName' },
    { 
      title: '分类', 
      dataIndex: 'category', 
      key: 'category',
      render: (cat: string) => {
        // 脱敏映射，去除“游戏、视讯、棋牌”等敏感字眼，转为中性互联网词汇
        const map: any = { SLOT: '模拟算法', LIVE: '实时交互', CHESS: '策略矩阵' };
        return <span>{map[cat] || cat}</span>;
      }
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: number) => status === 1 ? <Tag color="green">正常运行</Tag> : <Tag color="orange">通道维护</Tag> 
    }
  ];

  return (
    <Card title="XuanGuang 线路控制中台 (API 矩阵管理面板)" style={{ margin: 20 }}>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <span>筛选厂商：</span>
          <Select defaultValue="ALL" style={{ width: 120 }} onChange={setFilterProvider}>
            <Select.Option value="ALL">全部厂商</Select.Option>
            <Select.Option value="PG">PG 核心</Select.Option>
            <Select.Option value="CQ9">CQ9 核心</Select.Option>
            <Select.Option value="JILI">JILI 核心</Select.Option>
          </Select>
        </Space>
        
        <Button 
          type="primary" 
          icon={<CloudUploadOutlined />} 
          onClick={() => setIsModalOpen(true)}
        >
          批量导入接口矩阵
        </Button>
      </Space>

      <Table 
        dataSource={games} 
        columns={columns} 
        rowKey="gameCode" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 批量解析导入弹窗 */}
      <Modal
        title="导入大厅矩阵文件"
        open={isModalOpen}
        onOk={submitBulkGames}
        onCancel={() => {
          setIsModalOpen(false);
          setImportData([]);
        }}
        okText="确认入库"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{ disabled: importData.length === 0 }}
      >
        <div style={{ padding: '20px 0', textSelf: 'center' }}>
          <Upload
            accept=".xlsx, .xls"
            beforeUpload={handleExcelParse}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>选择标准厂商 Excel 文件</Button>
          </Upload>
          
          {importData.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Tag color="blue" icon={<FileExcelOutlined />}>
                已就绪：检测到 {importData.length} 行规范数据，随时可上传至网关。
              </Tag>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};