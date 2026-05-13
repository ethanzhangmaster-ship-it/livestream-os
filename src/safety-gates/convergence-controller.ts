/**
 * Convergence Controller
 * 核心职责：收敛控制，确保系统稳定收敛
 * 
 * 设计原则：
 * - 跟踪稳定性分数
 * - 检测收敛状态
 * - 控制变更终止
 */

import { Mutation } from '../types';

export interface ConvergenceState {
  score: number; // 收敛分数 (0-1)
  isConverged: boolean;
  iterations: number;
  recentImpacts: number[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface ConvergenceControllerConfig {
  convergenceThreshold: number; // 收敛阈值
  maxIterations: number; // 最大迭代次数
  stabilityWindow: number; // 稳定性窗口大小
  minImprovement: number; // 最小改进阈值
}

const DEFAULT_CONFIG: ConvergenceControllerConfig = {
  convergenceThreshold: 0.7,
  maxIterations: 100,
  stabilityWindow: 10,
  minImprovement: 0.01,
};

/**
 * Convergence Controller 类
 */
export class ConvergenceController {
  private config: ConvergenceControllerConfig;
  private iterations: number = 0;
  private impactHistory: number[] = [];
  private scoreHistory: number[] = [];

  constructor(config: Partial<ConvergenceControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录影响
   */
  recordImpact(impact: number): void {
    this.iterations++;
    this.impactHistory.push(impact);

    // 保持历史长度
    if (this.impactHistory.length > this.config.stabilityWindow * 2) {
      this.impactHistory.shift();
    }

    // 更新收敛分数
    const score = this.calculateScore();
    this.scoreHistory.push(score);
  }

  /**
   * 获取当前状态
   */
  getState(): ConvergenceState {
    const score = this.calculateScore();
    const isConverged = this.checkConvergence();
    const trend = this.analyzeTrend();

    return {
      score,
      isConverged,
      iterations: this.iterations,
      recentImpacts: this.impactHistory.slice(-this.config.stabilityWindow),
      trend,
    };
  }

  /**
   * 检查是否应该继续
   */
  shouldContinue(): boolean {
    const state = this.getState();

    // 如果已收敛，停止
    if (state.isConverged) {
      console.log(`[ConvergenceController] 已收敛（分数: ${(state.score * 100).toFixed(0)}%）`);
      return false;
    }

    // 如果达到最大迭代次数，停止
    if (this.iterations >= this.config.maxIterations) {
      console.log(`[ConvergenceController] 达到最大迭代次数（${this.iterations}）`);
      return false;
    }

    // 如果趋势持续下降，停止
    if (state.trend === 'declining' && this.iterations > 10) {
      console.log(`[ConvergenceController] 趋势持续下降，停止优化`);
      return false;
    }

    return true;
  }

  /**
   * 重置
   */
  reset(): void {
    this.iterations = 0;
    this.impactHistory = [];
    this.scoreHistory = [];
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 计算收敛分数
   */
  private calculateScore(): number {
    if (this.impactHistory.length < this.config.stabilityWindow) {
      return 0;
    }

    // 计算最近的影响均值
    const recent = this.impactHistory.slice(-this.config.stabilityWindow);
    const avgImpact = recent.reduce((sum, i) => sum + i, 0) / recent.length;

    // 计算方差（稳定性指标）
    const variance = this.calculateVariance(recent);
    const stabilityFactor = Math.exp(-variance * 10);

    // 计算改进趋势
    const improvementFactor = this.calculateImprovementFactor();

    // 综合分数 = 平均影响 * 稳定性因子 * 改进因子
    const score = Math.max(0, Math.min(1, avgImpact * stabilityFactor * improvementFactor));

    return score;
  }

  /**
   * 检查收敛
   */
  private checkConvergence(): boolean {
    if (this.scoreHistory.length < this.config.stabilityWindow) {
      return false;
    }

    // 检查最近的分数是否稳定
    const recent = this.scoreHistory.slice(-this.config.stabilityWindow);
    const avgScore = recent.reduce((sum, s) => sum + s, 0) / recent.length;

    // 如果平均分数超过阈值，认为已收敛
    return avgScore >= this.config.convergenceThreshold;
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(): 'improving' | 'stable' | 'declining' {
    if (this.impactHistory.length < 5) {
      return 'stable';
    }

    const recent = this.impactHistory.slice(-5);
    const first = recent.slice(0, 2).reduce((sum, i) => sum + i, 0) / 2;
    const last = recent.slice(-2).reduce((sum, i) => sum + i, 0) / 2;

    const diff = last - first;

    if (diff > this.config.minImprovement) {
      return 'improving';
    } else if (diff < -this.config.minImprovement) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;

    return variance;
  }

  /**
   * 计算改进因子
   */
  private calculateImprovementFactor(): number {
    if (this.impactHistory.length < 10) {
      return 1;
    }

    const early = this.impactHistory.slice(0, 5);
    const late = this.impactHistory.slice(-5);

    const earlyAvg = early.reduce((sum, i) => sum + i, 0) / early.length;
    const lateAvg = late.reduce((sum, i) => sum + i, 0) / late.length;

    // 如果后期比前期好，改进因子 > 1
    if (earlyAvg === 0) return 1;

    const improvement = lateAvg / earlyAvg;
    return Math.min(2, Math.max(0.5, improvement));
  }
}

/**
 * 导出便捷函数
 */
export function createConvergenceController(
  config?: Partial<ConvergenceControllerConfig>
): ConvergenceController {
  return new ConvergenceController(config);
}
