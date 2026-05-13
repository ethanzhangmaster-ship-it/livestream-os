/**
 * 抖音云启动脚本
 * 
 * 核心策略：
 * 1. 立即启动 HTTP 服务器监听 8000 端口（抖音云要求）
 * 2. 异步初始化 LivestreamOS 系统
 * 3. 失败不阻塞，保证服务始终可用
 */

import express, { Request, Response } from 'express';
import { LivestreamOS } from '../src/index';

const PORT = parseInt(process.env.PORT || '8000', 10);

async function startCloud() {
  console.log('========================================');
  console.log('  Livestream OS - 抖音云启动');
  console.log('========================================\n');

  // 1. 立即启动 HTTP 服务器（抖音云要求）
  const app = express();
  app.use(express.json());

  // 健康检查
  app.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      timestamp: Date.now(),
      service: 'livestream-os'
    });
  });

  // 根路径
  app.get('/', (req: Request, res: Response) => {
    res.json({ 
      service: 'Livestream OS',
      version: '0.1.0',
      status: 'running'
    });
  });

  // 抖音直播数据回调 - POST 请求（验证 + 实际数据）
  app.post('/live_data_callback', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      
      // 处理验证请求（event: verify_webhook）
      if (body.event === 'verify_webhook' && body.content?.challenge) {
        console.log(`[Douyin] 收到验证请求，challenge: ${body.content.challenge}`);
        // 返回小写的 challenge
        res.setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify({ challenge: body.content.challenge }));
      }
      
      // 处理实际数据
      const msgType = req.headers['x-msg-type'] as string;
      console.log(`[Douyin] 收到回调: ${msgType}`, body);
      
      // TODO: 转发给 LivestreamOS 处理
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('[Douyin] 回调处理失败:', error);
      res.status(500).json({ status: 'error' });
    }
  });

  // 启动服务器
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ HTTP 服务器已启动，监听端口 ${PORT}`);
    console.log(`✓ 健康检查: http://localhost:${PORT}/health`);
    console.log(`✓ 抖音回调: http://localhost:${PORT}/live_data_callback`);
  });

  // 2. 异步初始化 LivestreamOS（不阻塞）
  console.log('\n[LivestreamOS] 开始异步初始化...\n');

  const system = new LivestreamOS();

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号，正在关闭...');
    server.close();
    await system.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，正在关闭...');
    server.close();
    await system.shutdown();
    process.exit(0);
  });

  // 异步启动（失败不影响 HTTP 服务）
  system.start().catch(error => {
    console.error('[LivestreamOS] 初始化失败（服务继续运行）:', error);
  });

  // 定期打印状态
  setInterval(() => {
    try {
      const status = system.getStatus();
      console.log('\n[Status]', {
        running: status.isRunning,
        obs: status.obsConnected ? '✓' : '✗',
        mode: status.useFakeData ? '模拟' : '真实',
        attention: (status.currentAttention * 100).toFixed(1) + '%',
        alerts: status.activeAlerts,
      });
    } catch (error) {
      console.log('\n[Status] 系统尚未完全初始化');
    }
  }, 30000);
}

// 运行
startCloud().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});
