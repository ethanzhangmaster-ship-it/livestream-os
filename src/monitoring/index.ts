/**
 * 监控模块
 * 统一导出所有监控组件
 */

export * from './types';
export * from './metrics-collector';
export * from './alert-manager';
export * from './dashboard';

import { MetricsCollector, metricsCollector } from './metrics-collector';
import { AlertManager, AlertRules, alertManager } from './alert-manager';
import { MonitoringDashboard } from './dashboard';

/**
 * 监控系统
 * 整合指标收集、告警和仪表板
 */
export class MonitoringSystem {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private dashboard?: MonitoringDashboard;
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
    this.metricsCollector = metricsCollector;
    this.alertManager = alertManager;
  }

  /**
   * 初始化监控系统
   */
  async initialize(): Promise<void> {
    console.log('Initializing monitoring system...');

    // 启动指标收集
    this.metricsCollector.startCollection();

    // 添加默认告警规则
    this.setupDefaultAlertRules();

    // 启动告警检查
    this.alertManager.startChecking(10000);

    // 启动仪表板
    this.dashboard = new MonitoringDashboard(
      this.metricsCollector,
      this.alertManager,
      this.port
    );
    await this.dashboard.start();

    console.log('Monitoring system initialized');
  }

  /**
   * 设置默认告警规则
   */
  private setupDefaultAlertRules(): void {
    this.alertManager.addRule(AlertRules.highErrorRate(0.1));
    this.alertManager.addRule(AlertRules.lowAttention(0.3));
    this.alertManager.addRule(AlertRules.highLatency(1000));
    this.alertManager.addRule(AlertRules.circuitBreakerOpen());
    this.alertManager.addRule(AlertRules.obsDisconnected());
    this.alertManager.addRule(AlertRules.highMemoryUsage(500));
  }

  /**
   * 记录事件处理延迟
   */
  recordEventLatency(latencyMs: number): void {
    this.metricsCollector.observe('event_processing_latency', latencyMs);
    this.metricsCollector.incrementEventCount();
  }

  /**
   * 记录决策延迟
   */
  recordDecisionLatency(latencyMs: number, success: boolean): void {
    this.metricsCollector.observe('decision_latency', latencyMs);
    this.metricsCollector.incrementDecisionCount();

    if (success) {
      const rate = this.metricsCollector.getLatestValue('decision_success_rate') || 0;
      this.metricsCollector.setGauge('decision_success_rate', rate);
    }
  }

  /**
   * 记录场景切换
   */
  recordSceneSwitch(latencyMs: number, success: boolean): void {
    this.metricsCollector.observe('scene_switch_latency', latencyMs);

    if (success) {
      const rate = this.metricsCollector.getLatestValue('scene_switch_success_rate') || 0;
      this.metricsCollector.setGauge('scene_switch_success_rate', rate);
    }
  }

  /**
   * 更新注意力指标
   */
  updateAttentionMetrics(
    avgAttention: number,
    activeUsers: number,
    engagementRate: number,
    conversionRate: number
  ): void {
    this.metricsCollector.setGauge('avg_attention', avgAttention);
    this.metricsCollector.setGauge('active_users', activeUsers);
    this.metricsCollector.setGauge('engagement_rate', engagementRate);
    this.metricsCollector.setGauge('conversion_rate', conversionRate);
  }

  /**
   * 更新连接状态
   */
  updateConnectionStatus(obsConnected: boolean, douyinConnected: boolean): void {
    this.metricsCollector.setGauge('obs_connected', obsConnected ? 1 : 0);
    this.metricsCollector.setGauge('douyin_connected', douyinConnected ? 1 : 0);
  }

  /**
   * 记录错误
   */
  recordError(): void {
    this.metricsCollector.incrementErrorCount();
  }

  /**
   * 记录优化影响
   */
  recordOptimizationImpact(impact: number): void {
    this.metricsCollector.observe('optimization_impact', impact);
  }

  /**
   * 获取当前指标快照
   */
  getCurrentSnapshot() {
    return this.metricsCollector.collectSnapshot();
  }

  /**
   * 获取活动告警
   */
  getActiveAlerts() {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * 获取仪表板 URL
   */
  getDashboardUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * 关闭监控系统
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down monitoring system...');

    this.metricsCollector.stopCollection();
    this.alertManager.stopChecking();

    if (this.dashboard) {
      await this.dashboard.stop();
    }

    console.log('Monitoring system shut down');
  }
}

// 全局监控系统实例
export const monitoringSystem = new MonitoringSystem();
