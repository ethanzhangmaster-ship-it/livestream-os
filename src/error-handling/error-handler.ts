/**
 * 错误处理器
 * 提供统一的错误处理、恢复和重试机制
 */

import { AppError, ErrorCategory, ErrorSeverity, RecoveryStrategy, RecoveryPlan, RetryPolicy, BackoffStrategy } from './types';

export class ErrorHandler {
  private errorHistory: AppError[] = [];
  private maxHistorySize = 1000;
  private recoveryAttempts = new Map<string, number>();

  /**
   * 创建标准化错误
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    options: {
      context?: Record<string, any>;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code;
    error.category = category;
    error.severity = severity;
    error.timestamp = Date.now();
    error.context = options.context;
    error.recoverable = options.recoverable ?? true;
    error.cause = options.cause;

    this.recordError(error);
    return error;
  }

  /**
   * 记录错误
   */
  private recordError(error: AppError): void {
    this.errorHistory.push(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // 根据严重性执行不同操作
    if (error.severity === 'critical') {
      this.handleCriticalError(error);
    } else if (error.severity === 'high') {
      this.handleHighSeverityError(error);
    }
  }

  /**
   * 处理关键错误
   */
  private handleCriticalError(error: AppError): void {
    console.error(`[CRITICAL ERROR] ${error.code}: ${error.message}`);
    console.error('Context:', error.context);
    // 触发系统级告警
    this.triggerAlert(error);
  }

  /**
   * 处理高严重性错误
   */
  private handleHighSeverityError(error: AppError): void {
    console.error(`[HIGH SEVERITY] ${error.code}: ${error.message}`);
    // 记录但可能不中断系统
  }

  /**
   * 触发告警
   */
  private triggerAlert(error: AppError): void {
    // TODO: 集成告警系统（如飞书、邮件）
    console.log(`[ALERT] Error ${error.code} triggered alert`);
  }

  /**
   * 获取恢复策略
   */
  getRecoveryStrategy(error: AppError): RecoveryStrategy {
    if (!error.recoverable) {
      return 'shutdown';
    }

    // 根据错误类别决定恢复策略
    switch (error.category) {
      case 'network':
        return 'retry';
      case 'adapter':
        return 'fallback';
      case 'validation':
        return 'ignore';
      case 'runtime':
        return 'restart';
      case 'safety':
        return 'shutdown';
      case 'system':
        return 'shutdown';
      default:
        return 'retry';
    }
  }

  /**
   * 创建恢复计划
   */
  createRecoveryPlan(error: AppError): RecoveryPlan {
    const strategy = this.getRecoveryStrategy(error);

    const basePlan: RecoveryPlan = {
      strategy,
      maxAttempts: 3,
      backoffMs: 1000,
    };

    // 根据错误类别调整计划
    switch (error.category) {
      case 'network':
        return {
          ...basePlan,
          maxAttempts: 5,
          backoffMs: 2000,
        };
      case 'adapter':
        return {
          ...basePlan,
          maxAttempts: 3,
          backoffMs: 1000,
        };
      default:
        return basePlan;
    }
  }

  /**
   * 执行恢复
   */
  async recover(
    error: AppError,
    operation: () => Promise<void>,
    fallback?: () => Promise<void>
  ): Promise<boolean> {
    const plan = this.createRecoveryPlan(error);
    const errorKey = `${error.code}-${error.timestamp}`;

    // 检查重试次数
    const attempts = this.recoveryAttempts.get(errorKey) || 0;
    if (attempts >= plan.maxAttempts) {
      console.error(`Max recovery attempts reached for error ${error.code}`);

      // 尝试降级
      if (plan.strategy === 'fallback' && fallback) {
        console.log('Executing fallback...');
        await fallback();
        return true;
      }

      return false;
    }

    // 根据策略执行恢复
    switch (plan.strategy) {
      case 'retry':
        return await this.retryWithBackoff(operation, attempts, plan.backoffMs);

      case 'fallback':
        if (fallback) {
          await fallback();
          return true;
        }
        return false;

      case 'restart':
        // 重启逻辑由外部组件处理
        console.log('Restart required for error:', error.code);
        return false;

      case 'ignore':
        console.log('Ignoring error:', error.code);
        return true;

      case 'shutdown':
        console.error('Shutdown required for critical error:', error.code);
        return false;

      default:
        return false;
    }
  }

  /**
   * 带退避的重试
   */
  private async retryWithBackoff(
    operation: () => Promise<void>,
    attempt: number,
    baseDelayMs: number
  ): Promise<boolean> {
    const delay = this.calculateBackoff(attempt, baseDelayMs, 'exponential');

    console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);

    await this.sleep(delay);

    try {
      await operation();
      return true;
    } catch (err) {
      console.error(`Retry ${attempt + 1} failed:`, err);
      return false;
    }
  }

  /**
   * 计算退避时间
   */
  private calculateBackoff(
    attempt: number,
    baseDelayMs: number,
    strategy: BackoffStrategy
  ): number {
    switch (strategy) {
      case 'fixed':
        return baseDelayMs;

      case 'linear':
        return baseDelayMs * (attempt + 1);

      case 'exponential':
        return baseDelayMs * Math.pow(2, attempt);

      default:
        return baseDelayMs;
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit?: number): AppError[] {
    if (limit) {
      return this.errorHistory.slice(-limit);
    }
    return [...this.errorHistory];
  }

  /**
   * 获取错误统计
   */
  getErrorMetrics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      validation: 0,
      runtime: 0,
      adapter: 0,
      safety: 0,
      system: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    this.errorHistory.forEach(error => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
    });

    return {
      total: this.errorHistory.length,
      byCategory,
      bySeverity,
    };
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
  }

  /**
   * 工具方法：sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
export const errorHandler = new ErrorHandler();
