/**
 * 错误处理模块
 * 统一导出所有错误处理组件
 */

export * from './types';
export * from './error-handler';
export * from './circuit-breaker';
export * from './health-check';

import { ErrorHandler, errorHandler } from './error-handler';
import { CircuitBreakerManager, circuitBreakerManager } from './circuit-breaker';
import { HealthChecker, HealthChecks, healthChecker } from './health-check';

/**
 * 错误处理系统
 * 整合所有错误处理组件
 */
export class ErrorHandlingSystem {
  private errorHandler: ErrorHandler;
  private circuitBreakerManager: CircuitBreakerManager;
  private healthChecker: HealthChecker;

  constructor() {
    this.errorHandler = errorHandler;
    this.circuitBreakerManager = circuitBreakerManager;
    this.healthChecker = healthChecker;
  }

  /**
   * 初始化错误处理系统
   */
  async initialize(components: {
    obsAdapter?: any;
    database?: any;
    attentionBus?: any;
  }): Promise<void> {
    console.log('Initializing error handling system...');

    // 注册健康检查
    if (components.obsAdapter) {
      this.healthChecker.registerCheck(
        'obs-connection',
        HealthChecks.obsConnection(components.obsAdapter)
      );
    }

    if (components.database) {
      this.healthChecker.registerCheck(
        'database',
        HealthChecks.database(components.database)
      );
    }

    if (components.attentionBus) {
      this.healthChecker.registerCheck(
        'event-queue',
        HealthChecks.eventQueue(components.attentionBus)
      );
    }

    // 注册内存检查
    this.healthChecker.registerCheck('memory', HealthChecks.memory(500));

    // 启动定期健康检查
    this.healthChecker.startPeriodicCheck();

    console.log('Error handling system initialized');
  }

  /**
   * 包装操作（带错误处理和熔断保护）
   */
  async executeWithProtection<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      fallback?: () => Promise<T>;
      enableCircuitBreaker?: boolean;
      enableRetry?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const {
      fallback,
      enableCircuitBreaker = true,
      enableRetry = true,
      maxRetries = 3,
    } = options;

    // 获取或创建熔断器
    const breaker = enableCircuitBreaker
      ? this.circuitBreakerManager.getBreaker(operationName)
      : null;

    // 带重试的执行函数
    const executeWithRetry = async (): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          console.warn(`${operationName} attempt ${attempt + 1} failed:`, error);

          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries - 1) {
            await this.sleep(1000 * (attempt + 1)); // 线性退避
          }
        }
      }

      throw lastError;
    };

    try {
      // 如果启用熔断器，通过熔断器执行
      if (breaker) {
        return await breaker.execute(executeWithRetry);
      } else {
        return await executeWithRetry();
      }
    } catch (error) {
      console.error(`${operationName} failed after protection:`, error);

      // 尝试降级
      if (fallback) {
        console.log(`Executing fallback for ${operationName}...`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * 处理错误
   */
  handleError(
    error: Error,
    context: {
      component: string;
      operation: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const appError = this.errorHandler.createError(
      this.generateErrorCode(error),
      error.message,
      this.categorizeError(error),
      this.determineSeverity(error),
      {
        context,
        recoverable: this.isRecoverable(error),
        cause: error,
      }
    );

    console.error('Error handled:', {
      code: appError.code,
      category: appError.category,
      severity: appError.severity,
      message: appError.message,
    });
  }

  /**
   * 生成错误代码
   */
  private generateErrorCode(error: Error): string {
    if (error.message.includes('ECONNREFUSED')) return 'NET001';
    if (error.message.includes('timeout')) return 'NET002';
    if (error.message.includes('validation')) return 'VAL001';
    return 'GEN001';
  }

  /**
   * 分类错误
   */
  private categorizeError(error: any): 'network' | 'validation' | 'runtime' | 'adapter' | 'safety' | 'system' {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return 'network';
    if (error.message.includes('validation')) return 'validation';
    if (error.message.includes('OBS') || error.message.includes('Douyin')) return 'adapter';
    return 'runtime';
  }

  /**
   * 确定严重性
   */
  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error.message.includes('critical')) return 'critical';
    if (error.message.includes('ECONNREFUSED')) return 'high';
    if (error.message.includes('validation')) return 'medium';
    return 'low';
  }

  /**
   * 是否可恢复
   */
  private isRecoverable(error: Error): boolean {
    const nonRecoverableErrors = ['ENOTFOUND', 'EAI_AGAIN'];
    return !nonRecoverableErrors.includes((error as any).code);
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth() {
    return await this.healthChecker.runAllChecks();
  }

  /**
   * 获取错误指标
   */
  getErrorMetrics() {
    return this.errorHandler.getErrorMetrics();
  }

  /**
   * 获取熔断器状态
   */
  getCircuitBreakerStates() {
    return this.circuitBreakerManager.getAllStates();
  }

  /**
   * 关闭错误处理系统
   */
  shutdown(): void {
    this.healthChecker.stopPeriodicCheck();
    console.log('Error handling system shut down');
  }

  /**
   * 工具方法：sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 全局错误处理系统实例
export const errorHandlingSystem = new ErrorHandlingSystem();
