/**
 * 熔断器
 * 防止级联故障，保护系统稳定性
 */

import { CircuitState, CircuitBreakerConfig, CircuitBreakerState } from './types';

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 3,
      timeout: config?.timeout ?? 60000, // 60s
      monitoringPeriod: config?.monitoringPeriod ?? 10000, // 10s
    };

    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now(),
    };
  }

  /**
   * 执行操作（带熔断保护）
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // 检查熔断器状态
    if (this.state.state === 'open') {
      // 检查是否可以进入半开状态
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.state.failureCount = 0;

    if (this.state.state === 'half-open') {
      this.state.successCount++;

      if (this.state.successCount >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    this.state.successCount = 0;

    if (this.state.state === 'half-open') {
      // 半开状态下失败立即打开
      this.transitionTo('open');
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * 是否应该尝试重置
   */
  private shouldAttemptReset(): boolean {
    const elapsed = Date.now() - this.state.lastFailureTime;
    return elapsed >= this.config.timeout;
  }

  /**
   * 状态转换
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state.state;
    this.state.state = newState;
    this.state.lastStateChange = Date.now();

    if (newState === 'closed') {
      this.state.failureCount = 0;
      this.state.successCount = 0;
    } else if (newState === 'open') {
      this.state.successCount = 0;
    } else if (newState === 'half-open') {
      this.state.successCount = 0;
    }

    console.log(`Circuit breaker [${this.name}] transitioned: ${oldState} → ${newState}`);
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * 强制打开熔断器
   */
  forceOpen(): void {
    this.transitionTo('open');
    this.state.lastFailureTime = Date.now();
  }

  /**
   * 强制关闭熔断器
   */
  forceClose(): void {
    this.transitionTo('closed');
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now(),
    };
  }

  /**
   * 获取配置
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 熔断器管理器
 * 管理多个熔断器实例
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * 获取或创建熔断器
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * 获取所有熔断器状态
   */
  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    this.breakers.forEach((breaker, name) => {
      states[name] = breaker.getState();
    });
    return states;
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * 移除熔断器
   */
  removeBreaker(name: string): boolean {
    return this.breakers.delete(name);
  }
}

// 全局熔断器管理器
export const circuitBreakerManager = new CircuitBreakerManager();
