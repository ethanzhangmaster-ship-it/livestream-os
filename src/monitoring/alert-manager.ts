/**
 * 告警系统
 * 基于指标的告警规则和通知
 */

import { Alert, AlertRule, AlertSeverity } from './types';
import { MetricsCollector } from './metrics-collector';

export class AlertManager {
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private maxHistorySize = 1000;
  private metricsCollector: MetricsCollector;
  private checkInterval?: NodeJS.Timeout;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
    console.log(`Alert rule added: ${rule.name}`);
  }

  /**
   * 移除告警规则
   */
  removeRule(name: string): boolean {
    return this.rules.delete(name);
  }

  /**
   * 获取所有规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 检查告警
   */
  checkAlerts(): Alert[] {
    const newAlerts: Alert[] = [];

    this.rules.forEach((rule, name) => {
      const metric = this.metricsCollector.getMetric(rule.metric);
      if (!metric || metric.values.length === 0) return;

      const currentValue = metric.values[metric.values.length - 1].value;
      const isTriggered = this.evaluateCondition(
        currentValue,
        rule.condition,
        rule.threshold
      );

      if (isTriggered) {
        const alert: Alert = {
          id: `${name}-${Date.now()}`,
          name,
          severity: rule.severity,
          message: `${rule.metric} ${rule.condition} ${rule.threshold} (current: ${currentValue})`,
          timestamp: Date.now(),
          metric: rule.metric,
          threshold: rule.threshold,
          currentValue,
          labels: rule.labels,
        };

        // 检查是否已存在相同告警
        if (!this.activeAlerts.has(name)) {
          this.activeAlerts.set(name, alert);
          newAlerts.push(alert);
          this.alertHistory.push(alert);

          // 触发通知
          this.notify(alert);
        }
      } else {
        // 如果告警已恢复，移除活动告警
        if (this.activeAlerts.has(name)) {
          const resolvedAlert = this.activeAlerts.get(name)!;
          console.log(`Alert resolved: ${name}`);
          this.activeAlerts.delete(name);

          // 发送恢复通知
          this.notifyResolved(resolvedAlert);
        }
      }
    });

    // 限制历史记录大小
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    return newAlerts;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    value: number,
    condition: 'gt' | 'lt' | 'eq' | 'neq',
    threshold: number
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'neq':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * 发送通知
   */
  private notify(alert: Alert): void {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🔥',
    };

    console.log(
      `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}`
    );

    // TODO: 集成实际通知渠道（飞书、邮件、短信等）
    // this.sendToFeishu(alert);
    // this.sendToEmail(alert);
  }

  /**
   * 发送恢复通知
   */
  private notifyResolved(alert: Alert): void {
    console.log(`✅ Alert resolved: ${alert.name}`);
  }

  /**
   * 启动定期检查
   */
  startChecking(intervalMs: number = 10000): void {
    if (this.checkInterval) {
      console.log('Alert checking already running');
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, intervalMs);

    console.log(`Alert checking started (interval: ${intervalMs}ms)`);
  }

  /**
   * 停止定期检查
   */
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('Alert checking stopped');
    }
  }

  /**
   * 获取活动告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): Alert[] {
    if (limit) {
      return this.alertHistory.slice(-limit);
    }
    return [...this.alertHistory];
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(name: string): boolean {
    if (this.activeAlerts.has(name)) {
      this.activeAlerts.delete(name);
      console.log(`Alert acknowledged: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 清除所有告警
   */
  clearAll(): void {
    this.stopChecking();
    this.activeAlerts.clear();
    this.alertHistory = [];
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number;
    active: number;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    this.alertHistory.forEach(alert => {
      bySeverity[alert.severity]++;
    });

    return {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      bySeverity,
    };
  }
}

/**
 * 预定义告警规则
 */
export class AlertRules {
  /**
   * 高错误率告警
   */
  static highErrorRate(threshold: number = 0.1): AlertRule {
    return {
      name: 'high_error_rate',
      metric: 'error_rate',
      condition: 'gt',
      threshold,
      severity: 'warning',
      labels: { category: 'system' },
    };
  }

  /**
   * 低注意力告警
   */
  static lowAttention(threshold: number = 0.3): AlertRule {
    return {
      name: 'low_attention',
      metric: 'avg_attention',
      condition: 'lt',
      threshold,
      severity: 'warning',
      labels: { category: 'business' },
    };
  }

  /**
   * 高延迟告警
   */
  static highLatency(threshold: number = 1000): AlertRule {
    return {
      name: 'high_latency',
      metric: 'event_processing_latency',
      condition: 'gt',
      threshold,
      severity: 'warning',
      labels: { category: 'performance' },
    };
  }

  /**
   * 熔断器打开告警
   */
  static circuitBreakerOpen(): AlertRule {
    return {
      name: 'circuit_breaker_open',
      metric: 'circuit_breaker_open_count',
      condition: 'gt',
      threshold: 0,
      severity: 'error',
      labels: { category: 'system' },
    };
  }

  /**
   * OBS 断连告警
   */
  static obsDisconnected(): AlertRule {
    return {
      name: 'obs_disconnected',
      metric: 'obs_connected',
      condition: 'eq',
      threshold: 0,
      severity: 'critical',
      labels: { category: 'adapter' },
    };
  }

  /**
   * 内存使用过高告警
   */
  static highMemoryUsage(thresholdMB: number = 500): AlertRule {
    return {
      name: 'high_memory_usage',
      metric: 'memory_usage',
      condition: 'gt',
      threshold: thresholdMB,
      severity: 'warning',
      labels: { category: 'system' },
    };
  }
}

// 创建全局告警管理器
import { metricsCollector } from './metrics-collector';
export const alertManager = new AlertManager(metricsCollector);
