/**
 * 错误处理类型定义
 */

// ============================================
// Error Types (错误类型)
// ============================================

export type ErrorCategory =
  | 'network' // 网络错误（OBS 连接、WebSocket）
  | 'validation' // 数据验证错误
  | 'runtime' // 运行时错误
  | 'adapter' // 适配器错误（抖音、OBS）
  | 'safety' // 安全门错误
  | 'system'; // 系统错误

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, any>;
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================
// Recovery Strategy Types (恢复策略类型)
// ============================================

export type RecoveryStrategy =
  | 'retry' // 重试
  | 'fallback' // 降级
  | 'restart' // 重启组件
  | 'ignore' // 忽略（低严重性）
  | 'shutdown'; // 关闭系统（关键错误）

export interface RecoveryPlan {
  strategy: RecoveryStrategy;
  maxAttempts: number;
  backoffMs: number;
  fallbackAction?: () => Promise<void>;
  escalationThreshold?: number;
}

// ============================================
// Circuit Breaker Types (熔断器类型)
// ============================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // 失败次数阈值
  successThreshold: number; // 成功次数阈值（半开状态）
  timeout: number; // 熔断超时时间（ms）
  monitoringPeriod: number; // 监控周期（ms）
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastStateChange: number;
}

// ============================================
// Retry Policy Types (重试策略类型)
// ============================================

export type BackoffStrategy = 'fixed' | 'exponential' | 'linear';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[]; // 可重试的错误代码
}

// ============================================
// Error Handler Types (错误处理器类型)
// ============================================

export interface ErrorHandlerConfig {
  enableRetry: boolean;
  enableCircuitBreaker: boolean;
  enableFallback: boolean;
  logErrors: boolean;
  alertThreshold: number; // 告警阈值
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  avgRecoveryTimeMs: number;
  lastError?: AppError;
}

// ============================================
// Health Check Types (健康检查类型)
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  component: string;
  status: HealthStatus;
  message?: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: Map<string, HealthCheckResult>;
  lastCheck: number;
}
