/**
 * Stability Gate
 * 核心职责：安全正确性检查，防止系统震荡
 * 
 * 设计原则：
 * - 防止快速振荡
 * - 确保系统稳定
 */

import { Mutation, Violation } from '../types';

export interface StabilityCheckResult {
  stable: boolean;
  violations: Violation[];
  oscillationRisk: number; // 振荡风险 (0-1)
  recentMutations: number;
}

export interface StabilityGateConfig {
  maxMutationsPerMinute: number; // 每分钟最大变更次数
  oscillationThreshold: number; // 振荡阈值
  cooldownPeriod: number; // 冷却期（ms）
}

const DEFAULT_CONFIG: StabilityGateConfig = {
  maxMutationsPerMinute: 10,
  oscillationThreshold: 0.7,
  cooldownPeriod: 5000,
};

/**
 * Stability Gate 类
 */
export class StabilityGate {
  private config: StabilityGateConfig;
  private mutationHistory: Array<{
    mutation: Mutation;
    timestamp: number;
    impact: number;
  }> = [];

  constructor(config: Partial<StabilityGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检查稳定性
   */
  check(mutation: Mutation): StabilityCheckResult {
    const violations: Violation[] = [];
    const now = Date.now();

    // 清理过期历史
    this.cleanHistory(now);

    // 检查变更频率
    const recentMutations = this.getRecentMutations(now);
    if (recentMutations >= this.config.maxMutationsPerMinute) {
      violations.push({
        type: 'mutation_frequency_exceeded',
        severity: 'hard',
        message: `变更频率过高（${recentMutations} 次/分钟 > ${this.config.maxMutationsPerMinute}）`,
        details: { recentMutations },
      });
    }

    // 检查振荡风险
    const oscillationRisk = this.calculateOscillationRisk(mutation);
    if (oscillationRisk > this.config.oscillationThreshold) {
      violations.push({
        type: 'oscillation_risk_high',
        severity: 'soft',
        message: `振荡风险较高（${(oscillationRisk * 100).toFixed(0)}% > ${(this.config.oscillationThreshold * 100).toFixed(0)}%）`,
        details: { oscillationRisk },
      });
    }

    // 检查冷却期
    if (this.isInCooldown(now)) {
      violations.push({
        type: 'in_cooldown_period',
        severity: 'hard',
        message: '系统处于冷却期，暂不允许变更',
        details: { cooldownRemaining: this.getCooldownRemaining(now) },
      });
    }

    // 决定是否稳定
    const stable = !violations.some(v => v.severity === 'hard');

    return {
      stable,
      violations,
      oscillationRisk,
      recentMutations,
    };
  }

  /**
   * 记录变更
   */
  recordMutation(mutation: Mutation, impact: number): void {
    this.mutationHistory.push({
      mutation,
      timestamp: Date.now(),
      impact,
    });
  }

  /**
   * 获取变更历史
   */
  getHistory(): Array<{ mutation: Mutation; timestamp: number; impact: number }> {
    return this.mutationHistory.slice();
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.mutationHistory = [];
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 清理过期历史
   */
  private cleanHistory(now: number): void {
    const cutoff = now - 60000; // 保留最近 1 分钟
    this.mutationHistory = this.mutationHistory.filter(m => m.timestamp >= cutoff);
  }

  /**
   * 获取最近变更次数
   */
  private getRecentMutations(now: number): number {
    const cutoff = now - 60000;
    return this.mutationHistory.filter(m => m.timestamp >= cutoff).length;
  }

  /**
   * 计算振荡风险
   */
  private calculateOscillationRisk(mutation: Mutation): number {
    if (this.mutationHistory.length < 2) return 0;

    // 检查最近的变更是否有相反的影响
    const recent = this.mutationHistory.slice(-5);
    let oscillationCount = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];

      // 如果连续两次变更的影响相反，增加振荡计数
      if (prev.impact * curr.impact < 0) {
        oscillationCount++;
      }
    }

    // 振荡风险 = 振荡次数 / 总次数
    return oscillationCount / (recent.length - 1);
  }

  /**
   * 是否在冷却期
   */
  private isInCooldown(now: number): boolean {
    if (this.mutationHistory.length === 0) return false;

    const lastMutation = this.mutationHistory[this.mutationHistory.length - 1];
    return now - lastMutation.timestamp < this.config.cooldownPeriod;
  }

  /**
   * 获取剩余冷却时间
   */
  private getCooldownRemaining(now: number): number {
    if (this.mutationHistory.length === 0) return 0;

    const lastMutation = this.mutationHistory[this.mutationHistory.length - 1];
    const elapsed = now - lastMutation.timestamp;
    const remaining = this.config.cooldownPeriod - elapsed;

    return Math.max(0, remaining);
  }
}

/**
 * 导出便捷函数
 */
export function createStabilityGate(config?: Partial<StabilityGateConfig>): StabilityGate {
  return new StabilityGate(config);
}
