/**
 * 健康检查系统
 * 监控各组件健康状态
 */

import { HealthStatus, HealthCheckResult, SystemHealth } from './types';

export type HealthCheckFunction = () => Promise<HealthCheckResult>;

export class HealthChecker {
  private checks = new Map<string, HealthCheckFunction>();
  private lastResults = new Map<string, HealthCheckResult>();
  private checkInterval?: NodeJS.Timeout;
  private intervalMs: number;

  constructor(intervalMs: number = 30000) {
    this.intervalMs = intervalMs;
  }

  /**
   * 注册健康检查
   */
  registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
    console.log(`Health check registered: ${name}`);
  }

  /**
   * 移除健康检查
   */
  removeCheck(name: string): boolean {
    this.checks.delete(name);
    return this.lastResults.delete(name);
  }

  /**
   * 执行单个健康检查
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return {
        component: name,
        status: 'unhealthy',
        message: 'Health check not found',
        timestamp: Date.now(),
      };
    }

    try {
      const result = await checkFn();
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        component: name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
      this.lastResults.set(name, result);
      return result;
    }
  }

  /**
   * 执行所有健康检查
   */
  async runAllChecks(): Promise<SystemHealth> {
    const components = new Map<string, HealthCheckResult>();

    // 并行执行所有检查
    const checkPromises = Array.from(this.checks.keys()).map(async name => {
      const result = await this.runCheck(name);
      components.set(name, result);
    });

    await Promise.all(checkPromises);

    // 计算整体健康状态
    const overall = this.calculateOverallHealth(components);

    return {
      overall,
      components,
      lastCheck: Date.now(),
    };
  }

  /**
   * 计算整体健康状态
   */
  private calculateOverallHealth(components: Map<string, HealthCheckResult>): HealthStatus {
    const results = Array.from(components.values());

    // 如果有任何 unhealthy，整体为 unhealthy
    if (results.some(r => r.status === 'unhealthy')) {
      return 'unhealthy';
    }

    // 如果有任何 degraded，整体为 degraded
    if (results.some(r => r.status === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 启动定期检查
   */
  startPeriodicCheck(): void {
    if (this.checkInterval) {
      console.log('Periodic health check already running');
      return;
    }

    this.checkInterval = setInterval(async () => {
      const health = await this.runAllChecks();
      if (health.overall !== 'healthy') {
        console.warn(`System health: ${health.overall}`);
        health.components.forEach((result, name) => {
          if (result.status !== 'healthy') {
            console.warn(`  - ${name}: ${result.status} - ${result.message}`);
          }
        });
      }
    }, this.intervalMs);

    console.log(`Periodic health check started (interval: ${this.intervalMs}ms)`);
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('Periodic health check stopped');
    }
  }

  /**
   * 获取最近检查结果
   */
  getLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastResults);
  }

  /**
   * 获取特定组件的健康状态
   */
  getComponentHealth(name: string): HealthCheckResult | undefined {
    return this.lastResults.get(name);
  }

  /**
   * 清除所有检查
   */
  clear(): void {
    this.stopPeriodicCheck();
    this.checks.clear();
    this.lastResults.clear();
  }
}

/**
 * 预定义的健康检查
 */
export class HealthChecks {
  /**
   * OBS 连接健康检查
   */
  static obsConnection(obsAdapter: any): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      try {
        const isConnected = obsAdapter.isConnected();
        return {
          component: 'obs-connection',
          status: isConnected ? 'healthy' : 'unhealthy',
          message: isConnected ? 'OBS connected' : 'OBS not connected',
          timestamp: Date.now(),
          details: { connected: isConnected },
        };
      } catch (error) {
        return {
          component: 'obs-connection',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    };
  }

  /**
   * 数据库健康检查
   */
  static database(db: any): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      try {
        // 简单的查询测试
        db.prepare('SELECT 1').get();
        return {
          component: 'database',
          status: 'healthy',
          message: 'Database responsive',
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          component: 'database',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Database error',
          timestamp: Date.now(),
        };
      }
    };
  }

  /**
   * 内存使用健康检查
   */
  static memory(thresholdMB: number = 500): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;

      let status: HealthStatus = 'healthy';
      let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB`;

      if (heapUsedMB > thresholdMB) {
        status = 'degraded';
        message = `High memory usage: ${heapUsedMB.toFixed(2)}MB (threshold: ${thresholdMB}MB)`;
      }

      return {
        component: 'memory',
        status,
        message,
        timestamp: Date.now(),
        details: {
          heapUsedMB: heapUsedMB.toFixed(2),
          heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
          rssMB: (usage.rss / 1024 / 1024).toFixed(2),
        },
      };
    };
  }

  /**
   * 事件队列健康检查
   */
  static eventQueue(attentionBus: any, maxQueueSize: number = 1000): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      try {
        const queueSize = attentionBus.getQueueSize?.() || 0;

        let status: HealthStatus = 'healthy';
        let message = `Event queue size: ${queueSize}`;

        if (queueSize > maxQueueSize) {
          status = 'degraded';
          message = `Event queue backlog: ${queueSize} (threshold: ${maxQueueSize})`;
        }

        return {
          component: 'event-queue',
          status,
          message,
          timestamp: Date.now(),
          details: { queueSize },
        };
      } catch (error) {
        return {
          component: 'event-queue',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    };
  }
}

// 全局健康检查器
export const healthChecker = new HealthChecker();
