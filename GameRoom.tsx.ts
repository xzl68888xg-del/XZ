import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import http from '../utils/http';

export const GameRoom: React.FC = () => {
  const { provider, gameCode } = useParams<{ provider: string; gameCode: string }>();
  const [gameUrl, setGameUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // 向后端请求该模块的启动链接（后端会在此刻完成外部网关接口握手与自动额度划转）
    http.post('/api/user/games/launch', { provider, gameCode })
      .then((res) => {
        if (res.data.code === 200) {
          setGameUrl(res.data.data.url);
        } else {
          setErrorMsg(res.data.message || '进入应用容器失败');
        }
      })
      .catch(() => setErrorMsg('与外部应用服务器建立信令握手失败'))
      .finally(() => setLoading(false));
  }, [provider, gameCode]);

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在为您接通外部加密安全专线，并同步主账户网关数据...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ height: '100vh', background: '#141414', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Result
          status="error"
          title="无法载入应用容器"
          subTitle={errorMsg}
          extra={[
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/home')}>返回大厅</Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
      {/* 悬浮返回按钮，方便用户退出沙箱容器返回主系统 */}
      <Button 
        type="primary" 
        icon={<ArrowLeftOutlined />} 
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 999, opacity: 0.7 }}
        onClick={() => navigate('/home')}
      >
        退出应用
      </Button>

      {/* 核心应用视窗内嵌 iframe */}
      <iframe 
        src={gameUrl} 
        style={{ width: '100%', height: '100%', border: 'none' }} 
        allow="autoplay; encrypted-media; fullscreen"
      />
    </div>
  );
};