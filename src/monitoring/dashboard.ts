/**
 * 监控仪表板
 * 提供 Web UI 展示系统指标
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MetricsCollector } from './metrics-collector';
import { AlertManager } from './alert-manager';
import { MetricsSnapshot } from './types';

export class MonitoringDashboard {
  private server?: any;
  private port: number;
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;

  constructor(
    metricsCollector: MetricsCollector,
    alertManager: AlertManager,
    port: number = 8080
  ) {
    this.port = port;
    this.metricsCollector = metricsCollector;
    this.alertManager = alertManager;
  }

  /**
   * 启动仪表板服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        console.log(`Monitoring dashboard started at http://localhost:${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * 停止仪表板服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err: Error | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '/';

    try {
      // API 端点
      if (url === '/api/metrics') {
        await this.handleMetricsAPI(req, res);
      } else if (url === '/api/alerts') {
        await this.handleAlertsAPI(req, res);
      } else if (url === '/api/health') {
        await this.handleHealthAPI(req, res);
      } else if (url === '/api/snapshots') {
        await this.handleSnapshotsAPI(req, res);
      } else {
        // 主页面
        await this.handleDashboard(req, res);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }

  /**
   * 处理指标 API
   */
  private async handleMetricsAPI(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const metrics = this.metricsCollector.getAllMetrics();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(metrics, null, 2));
  }

  /**
   * 处理告警 API
   */
  private async handleAlertsAPI(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const alerts = {
      active: this.alertManager.getActiveAlerts(),
      history: this.alertManager.getAlertHistory(20),
      stats: this.alertManager.getAlertStats(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(alerts, null, 2));
  }

  /**
   * 处理健康检查 API
   */
  private async handleHealthAPI(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const snapshot = this.metricsCollector.collectSnapshot();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(snapshot, null, 2));
  }

  /**
   * 处理快照 API
   */
  private async handleSnapshotsAPI(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const snapshots = this.metricsCollector.getSnapshots(100);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(snapshots, null, 2));
  }

  /**
   * 处理仪表板页面
   */
  private async handleDashboard(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const html = this.generateDashboardHTML();
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }

  /**
   * 生成仪表板 HTML
   */
  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Livestream OS - 监控仪表板</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            color: #60a5fa;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #94a3b8;
            font-size: 14px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        
        .card h2 {
            font-size: 16px;
            color: #94a3b8;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #334155;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #cbd5e1;
            font-size: 14px;
        }
        
        .metric-value {
            font-size: 18px;
            font-weight: 600;
            color: #60a5fa;
        }
        
        .metric-value.warning {
            color: #fbbf24;
        }
        
        .metric-value.error {
            color: #ef4444;
        }
        
        .metric-value.success {
            color: #10b981;
        }
        
        .alerts {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
        }
        
        .alert {
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .alert.info {
            background: #1e3a5f;
            border-color: #60a5fa;
        }
        
        .alert.warning {
            background: #422006;
            border-color: #fbbf24;
        }
        
        .alert.error {
            background: #450a0a;
            border-color: #ef4444;
        }
        
        .alert.critical {
            background: #4c0519;
            border-color: #dc2626;
        }
        
        .alert-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .alert-message {
            font-size: 13px;
            color: #94a3b8;
        }
        
        .refresh-info {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            margin-top: 20px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-indicator.healthy {
            background: #10b981;
        }
        
        .status-indicator.degraded {
            background: #fbbf24;
        }
        
        .status-indicator.unhealthy {
            background: #ef4444;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 Livestream OS 监控仪表板</h1>
        <p>实时系统监控与告警</p>
    </div>
    
    <div class="grid">
        <div class="card">
            <h2>⚡ 性能指标</h2>
            <div id="performance-metrics">
                <p style="color: #64748b;">加载中...</p>
            </div>
        </div>
        
        <div class="card">
            <h2>📊 业务指标</h2>
            <div id="business-metrics">
                <p style="color: #64748b;">加载中...</p>
            </div>
        </div>
        
        <div class="card">
            <h2>🖥️ 系统状态</h2>
            <div id="system-metrics">
                <p style="color: #64748b;">加载中...</p>
            </div>
        </div>
    </div>
    
    <div class="alerts">
        <h2>🚨 活动告警</h2>
        <div id="active-alerts">
            <p style="color: #64748b;">加载中...</p>
        </div>
    </div>
    
    <div class="refresh-info">
        <p>自动刷新间隔: 5 秒 | 最后更新: <span id="last-update">-</span></p>
    </div>
    
    <script>
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        }
        
        async function fetchAlerts() {
            try {
                const response = await fetch('/api/alerts');
                const data = await response.json();
                updateAlerts(data);
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            }
        }
        
        function updateDashboard(data) {
            // 性能指标
            if (data.performance) {
                const perf = data.performance;
                document.getElementById('performance-metrics').innerHTML = \`
                    <div class="metric">
                        <span class="metric-label">事件处理延迟</span>
                        <span class="metric-value">\${perf.eventProcessingLatency.toFixed(2)} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">事件吞吐量</span>
                        <span class="metric-value">\${perf.eventThroughput.toFixed(2)} /s</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">决策延迟</span>
                        <span class="metric-value">\${perf.decisionLatency.toFixed(2)} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">场景切换延迟</span>
                        <span class="metric-value">\${perf.sceneSwitchLatency.toFixed(2)} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">内存使用</span>
                        <span class="metric-value \${perf.memoryUsage > 500 ? 'warning' : ''}">\${perf.memoryUsage.toFixed(2)} MB</span>
                    </div>
                \`;
            }
            
            // 业务指标
            if (data.business) {
                const biz = data.business;
                document.getElementById('business-metrics').innerHTML = \`
                    <div class="metric">
                        <span class="metric-label">平均注意力</span>
                        <span class="metric-value \${biz.avgAttention < 0.3 ? 'warning' : 'success'}">\${(biz.avgAttention * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">注意力趋势</span>
                        <span class="metric-value">\${biz.attentionTrend === 'rising' ? '📈 上升' : biz.attentionTrend === 'falling' ? '📉 下降' : '➡️ 稳定'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">活跃用户</span>
                        <span class="metric-value">\${biz.activeUsers}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">参与率</span>
                        <span class="metric-value">\${(biz.engagementRate * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">转化率</span>
                        <span class="metric-value">\${(biz.conversionRate * 100).toFixed(1)}%</span>
                    </div>
                \`;
            }
            
            // 系统状态
            if (data.system) {
                const sys = data.system;
                const healthClass = sys.healthStatus === 'healthy' ? 'healthy' : sys.healthStatus === 'degraded' ? 'degraded' : 'unhealthy';
                document.getElementById('system-metrics').innerHTML = \`
                    <div class="metric">
                        <span class="metric-label">健康状态</span>
                        <span class="metric-value">
                            <span class="status-indicator \${healthClass}"></span>
                            \${sys.healthStatus.toUpperCase()}
                        </span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">运行时间</span>
                        <span class="metric-value">\${formatUptime(sys.uptime)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">错误率</span>
                        <span class="metric-value \${sys.errorRate > 0.1 ? 'error' : ''}">\${sys.errorRate.toFixed(4)} /s</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">OBS 连接</span>
                        <span class="metric-value \${sys.obsConnected ? 'success' : 'error'}">\${sys.obsConnected ? '✓ 已连接' : '✗ 未连接'}</span>
                    </div>
                \`;
            }
            
            // 更新时间
            document.getElementById('last-update').textContent = new Date().toLocaleTimeString('zh-CN');
        }
        
        function updateAlerts(data) {
            const alertsContainer = document.getElementById('active-alerts');
            
            if (data.active.length === 0) {
                alertsContainer.innerHTML = '<p style="color: #10b981;">✓ 无活动告警</p>';
                return;
            }
            
            alertsContainer.innerHTML = data.active.map(alert => \`
                <div class="alert \${alert.severity}">
                    <div class="alert-title">\${alert.name}</div>
                    <div class="alert-message">\${alert.message}</div>
                </div>
            \`).join('');
        }
        
        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return \`\${hours}h \${minutes}m \${secs}s\`;
        }
        
        // 初始加载
        fetchMetrics();
        fetchAlerts();
        
        // 定期刷新
        setInterval(fetchMetrics, 5000);
        setInterval(fetchAlerts, 5000);
    </script>
</body>
</html>
    `;
  }
}
