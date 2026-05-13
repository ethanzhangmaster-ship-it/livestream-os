/**
 * 监控指标类型定义
 */

// ============================================
// Metric Types (指标类型)
// ============================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  values: MetricValue[];
  unit?: string;
}

// ============================================
// Performance Metrics (性能指标)
// ============================================

export interface PerformanceMetrics {
  // 事件处理
  eventProcessingLatency: number; // ms
  eventThroughput: number; // events/s
  
  // 运行时决策
  decisionLatency: number; // ms
  decisionSuccessRate: number; // 0-1
  
  // 场景切换
  sceneSwitchLatency: number; // ms
  sceneSwitchSuccessRate: number; // 0-1
  
  // 优化闭环
  optimizationCycleTime: number; // ms
  mutationApprovalRate: number; // 0-1
  
  // 系统资源
  cpuUsage: number; // 0-1
  memoryUsage: number; // MB
  eventQueueSize: number;
}

// ============================================
// Business Metrics (业务指标)
// ============================================

export interface BusinessMetrics {
  // 注意力指标
  avgAttention: number; // 0-1
  attentionTrend: 'rising' | 'stable' | 'falling';
  
  // 用户行为
  activeUsers: number;
  engagementRate: number; // 0-1
  conversionRate: number; // 0-1
  
  // 场景效果
  scenePerformance: Map<string, {
    avgAttention: number;
    duration: number;
    conversionRate: number;
  }>;
  
  // 优化效果
  optimizationImpact: number; // 平均影响值
  knowledgeGraphHitRate: number; // 0-1
}

// ============================================
// System Metrics (系统指标)
// ============================================

export interface SystemMetrics {
  // 运行时间
  uptime: number; // seconds
  
  // 错误统计
  errorRate: number; // errors/s
  errorCount: number;
  
  // 熔断器状态
  circuitBreakerOpenCount: number;
  circuitBreakerStates: Record<string, 'closed' | 'open' | 'half-open'>;
  
  // 健康状态
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  componentHealth: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  
  // 连接状态
  obsConnected: boolean;
  douyinConnected: boolean;
}

// ============================================
// Metrics Collector Types (指标收集器类型)
// ============================================

export interface MetricsCollectorConfig {
  collectionIntervalMs: number; // 收集间隔
  retentionPeriodMs: number; // 保留时间
  enablePerformanceMetrics: boolean;
  enableBusinessMetrics: boolean;
  enableSystemMetrics: boolean;
}

export interface MetricsSnapshot {
  timestamp: number;
  performance?: PerformanceMetrics;
  business?: BusinessMetrics;
  system?: SystemMetrics;
}

// ============================================
// Alert Types (告警类型)
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  metric: string;
  threshold: number;
  currentValue: number;
  labels?: Record<string, string>;
}

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'neq';
  threshold: number;
  severity: AlertSeverity;
  duration?: number; // 持续时间（ms）
  labels?: Record<string, string>;
}

// ============================================
// Dashboard Types (仪表板类型)
// ============================================

export interface DashboardWidget {
  id: string;
  type: 'line' | 'gauge' | 'counter' | 'table';
  title: string;
  metric: string;
  refreshIntervalMs: number;
  config?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshIntervalMs: number;
}
