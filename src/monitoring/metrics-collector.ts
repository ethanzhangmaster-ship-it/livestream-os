/**
 * 指标收集器
 * 收集和管理系统指标
 */

import {
  Metric,
  MetricType,
  MetricValue,
  PerformanceMetrics,
  BusinessMetrics,
  SystemMetrics,
  MetricsCollectorConfig,
  MetricsSnapshot,
} from './types';

export class MetricsCollector {
  private metrics = new Map<string, Metric>();
  private config: MetricsCollectorConfig;
  private collectionInterval?: NodeJS.Timeout;
  private snapshots: MetricsSnapshot[] = [];
  private maxSnapshots = 1000;

  // 运行时数据
  private startTime = Date.now();
  private eventCount = 0;
  private decisionCount = 0;
  private errorCount = 0;

  constructor(config?: Partial<MetricsCollectorConfig>) {
    this.config = {
      collectionIntervalMs: config?.collectionIntervalMs ?? 10000,
      retentionPeriodMs: config?.retentionPeriodMs ?? 3600000, // 1 hour
      enablePerformanceMetrics: config?.enablePerformanceMetrics ?? true,
      enableBusinessMetrics: config?.enableBusinessMetrics ?? true,
      enableSystemMetrics: config?.enableSystemMetrics ?? true,
    };
  }

  /**
   * 注册指标
   */
  registerMetric(
    name: string,
    type: MetricType,
    description: string,
    unit?: string
  ): void {
    this.metrics.set(name, {
      name,
      type,
      description,
      values: [],
      unit,
    });
  }

  /**
   * 记录指标值
   */
  recordValue(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Metric ${name} not registered`);
      return;
    }

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // 清理过期数据
    this.cleanupOldValues(metric);
  }

  /**
   * 增加计数器
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      console.warn(`Counter ${name} not registered or not a counter`);
      return;
    }

    const lastValue = metric.values.length > 0
      ? metric.values[metric.values.length - 1].value
      : 0;

    this.recordValue(name, lastValue + value, labels);
  }

  /**
   * 设置仪表值
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      console.warn(`Gauge ${name} not registered or not a gauge`);
      return;
    }

    this.recordValue(name, value, labels);
  }

  /**
   * 记录直方图值
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      console.warn(`Histogram ${name} not registered or not a histogram`);
      return;
    }

    this.recordValue(name, value, labels);
  }

  /**
   * 获取指标
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 收集性能指标
   */
  collectPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();

    return {
      eventProcessingLatency: this.getAverageValue('event_processing_latency') || 0,
      eventThroughput: this.calculateThroughput('event_count') || 0,
      decisionLatency: this.getAverageValue('decision_latency') || 0,
      decisionSuccessRate: this.getLatestValue('decision_success_rate') || 0,
      sceneSwitchLatency: this.getAverageValue('scene_switch_latency') || 0,
      sceneSwitchSuccessRate: this.getLatestValue('scene_switch_success_rate') || 0,
      optimizationCycleTime: this.getAverageValue('optimization_cycle_time') || 0,
      mutationApprovalRate: this.getLatestValue('mutation_approval_rate') || 0,
      cpuUsage: this.getLatestValue('cpu_usage') || 0,
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
      eventQueueSize: this.getLatestValue('event_queue_size') || 0,
    };
  }

  /**
   * 收集业务指标
   */
  collectBusinessMetrics(): BusinessMetrics {
    const avgAttention = this.getLatestValue('avg_attention') || 0;
    const prevAttention = this.getPreviousValue('avg_attention') || avgAttention;

    let attentionTrend: 'rising' | 'stable' | 'falling' = 'stable';
    if (avgAttention > prevAttention * 1.05) attentionTrend = 'rising';
    else if (avgAttention < prevAttention * 0.95) attentionTrend = 'falling';

    return {
      avgAttention,
      attentionTrend,
      activeUsers: this.getLatestValue('active_users') || 0,
      engagementRate: this.getLatestValue('engagement_rate') || 0,
      conversionRate: this.getLatestValue('conversion_rate') || 0,
      scenePerformance: new Map(),
      optimizationImpact: this.getAverageValue('optimization_impact') || 0,
      knowledgeGraphHitRate: this.getLatestValue('knowledge_graph_hit_rate') || 0,
    };
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics(): SystemMetrics {
    const uptime = (Date.now() - this.startTime) / 1000;

    return {
      uptime,
      errorRate: this.errorCount / uptime,
      errorCount: this.errorCount,
      circuitBreakerOpenCount: this.getLatestValue('circuit_breaker_open_count') || 0,
      circuitBreakerStates: {},
      healthStatus: 'healthy',
      componentHealth: {},
      obsConnected: this.getLatestValue('obs_connected') === 1,
      douyinConnected: this.getLatestValue('douyin_connected') === 1,
    };
  }

  /**
   * 收集所有指标快照
   */
  collectSnapshot(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
    };

    if (this.config.enablePerformanceMetrics) {
      snapshot.performance = this.collectPerformanceMetrics();
    }

    if (this.config.enableBusinessMetrics) {
      snapshot.business = this.collectBusinessMetrics();
    }

    if (this.config.enableSystemMetrics) {
      snapshot.system = this.collectSystemMetrics();
    }

    this.snapshots.push(snapshot);

    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * 启动定期收集
   */
  startCollection(): void {
    if (this.collectionInterval) {
      console.log('Metrics collection already running');
      return;
    }

    // 注册默认指标
    this.registerDefaultMetrics();

    this.collectionInterval = setInterval(() => {
      this.collectSnapshot();
    }, this.config.collectionIntervalMs);

    console.log(`Metrics collection started (interval: ${this.config.collectionIntervalMs}ms)`);
  }

  /**
   * 停止定期收集
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
      console.log('Metrics collection stopped');
    }
  }

  /**
   * 注册默认指标
   */
  private registerDefaultMetrics(): void {
    // 性能指标
    this.registerMetric('event_processing_latency', 'histogram', 'Event processing latency', 'ms');
    this.registerMetric('event_count', 'counter', 'Total event count');
    this.registerMetric('decision_latency', 'histogram', 'Decision latency', 'ms');
    this.registerMetric('decision_success_rate', 'gauge', 'Decision success rate');
    this.registerMetric('scene_switch_latency', 'histogram', 'Scene switch latency', 'ms');
    this.registerMetric('scene_switch_success_rate', 'gauge', 'Scene switch success rate');
    this.registerMetric('optimization_cycle_time', 'histogram', 'Optimization cycle time', 'ms');
    this.registerMetric('mutation_approval_rate', 'gauge', 'Mutation approval rate');
    this.registerMetric('cpu_usage', 'gauge', 'CPU usage');
    this.registerMetric('event_queue_size', 'gauge', 'Event queue size');

    // 业务指标
    this.registerMetric('avg_attention', 'gauge', 'Average attention');
    this.registerMetric('active_users', 'gauge', 'Active users count');
    this.registerMetric('engagement_rate', 'gauge', 'Engagement rate');
    this.registerMetric('conversion_rate', 'gauge', 'Conversion rate');
    this.registerMetric('optimization_impact', 'histogram', 'Optimization impact');
    this.registerMetric('knowledge_graph_hit_rate', 'gauge', 'Knowledge graph hit rate');

    // 系统指标
    this.registerMetric('circuit_breaker_open_count', 'counter', 'Circuit breaker open count');
    this.registerMetric('obs_connected', 'gauge', 'OBS connection status');
    this.registerMetric('douyin_connected', 'gauge', 'Douyin connection status');
  }

  /**
   * 获取平均值
   */
  public getAverageValue(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length === 0) return undefined;

    const sum = metric.values.reduce((acc, v) => acc + v.value, 0);
    return sum / metric.values.length;
  }

  /**
   * 获取最新值
   */
  public getLatestValue(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length === 0) return undefined;

    return metric.values[metric.values.length - 1].value;
  }

  /**
   * 获取前一个值
   */
  private getPreviousValue(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length < 2) return undefined;

    return metric.values[metric.values.length - 2].value;
  }

  /**
   * 计算吞吐量
   */
  private calculateThroughput(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length < 2) return undefined;

    const latest = metric.values[metric.values.length - 1];
    const first = metric.values[0];
    const timeDiff = (latest.timestamp - first.timestamp) / 1000; // seconds

    if (timeDiff <= 0) return undefined;

    return (latest.value - first.value) / timeDiff;
  }

  /**
   * 清理过期数据
   */
  private cleanupOldValues(metric: Metric): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    metric.values = metric.values.filter(v => v.timestamp >= cutoff);
  }

  /**
   * 获取快照历史
   */
  getSnapshots(limit?: number): MetricsSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  /**
   * 更新事件计数
   */
  incrementEventCount(): void {
    this.eventCount++;
    this.increment('event_count');
  }

  /**
   * 更新决策计数
   */
  incrementDecisionCount(): void {
    this.decisionCount++;
  }

  /**
   * 更新错误计数
   */
  incrementErrorCount(): void {
    this.errorCount++;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.stopCollection();
    this.metrics.clear();
    this.snapshots = [];
    this.eventCount = 0;
    this.decisionCount = 0;
    this.errorCount = 0;
  }
}

// 全局指标收集器
export const metricsCollector = new MetricsCollector();
