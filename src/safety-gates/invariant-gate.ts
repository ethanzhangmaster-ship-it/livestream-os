/**
 * Invariant Gate
 * 核心职责：行为正确性检查，阻断硬违规
 * 
 * 设计原则：
 * - Hard violation = 直接阻断
 * - Soft violation = 允许但警告
 */

import { Mutation, Violation } from '../types';

export interface InvariantCheckResult {
  allowed: boolean;
  violations: Violation[];
  hardViolations: Violation[];
  softViolations: Violation[];
}

export interface InvariantGateConfig {
  hookDurationMax: number; // Hook 场景最大时长（ms）
  avgAttentionMin: number; // 平均注意力最小值
  dropRiskMax: number; // 流失风险最大值
  mutationStepSizeMax: number; // 变更步长最大值
}

const DEFAULT_CONFIG: InvariantGateConfig = {
  hookDurationMax: 4000,
  avgAttentionMin: 0.5,
  dropRiskMax: 0.6,
  mutationStepSizeMax: 0.3,
};

/**
 * Invariant Gate 类
 */
export class InvariantGate {
  private config: InvariantGateConfig;

  constructor(config: Partial<InvariantGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检查变更
   */
  check(mutation: Mutation, context?: any): InvariantCheckResult {
    const violations: Violation[] = [];

    // 检查变更类型
    switch (mutation.type) {
      case 'scene_duration':
        violations.push(...this.checkSceneDuration(mutation, context));
        break;

      case 'overlay_timing':
        violations.push(...this.checkOverlayTiming(mutation, context));
        break;

      case 'transition_speed':
        violations.push(...this.checkTransitionSpeed(mutation, context));
        break;

      case 'text_content':
        violations.push(...this.checkTextContent(mutation, context));
        break;

      case 'scene_order':
        violations.push(...this.checkSceneOrder(mutation, context));
        break;

      case 'response_template':
        violations.push(...this.checkResponseTemplate(mutation, context));
        break;
    }

    // 检查变更步长
    violations.push(...this.checkMutationStepSize(mutation));

    // 分类违规
    const hardViolations = violations.filter(v => v.severity === 'hard');
    const softViolations = violations.filter(v => v.severity === 'soft');

    // 决定是否允许
    const allowed = hardViolations.length === 0;

    return {
      allowed,
      violations,
      hardViolations,
      softViolations,
    };
  }

  /**
   * 批量检查
   */
  checkBatch(mutations: Mutation[], context?: any): InvariantCheckResult[] {
    return mutations.map(mutation => this.check(mutation, context));
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 检查场景时长变更
   */
  private checkSceneDuration(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查 Hook 场景时长
    if (change.scene === 'hook' || change.scene === 'current') {
      const newDuration = (context?.currentDuration || 0) + change.delta;

      if (newDuration > this.config.hookDurationMax) {
        violations.push({
          type: 'hook_duration_exceeded',
          severity: 'hard',
          message: `Hook 场景时长不能超过 ${this.config.hookDurationMax / 1000} 秒`,
          details: { duration: newDuration },
        });
      }

      if (newDuration < 1000) {
        violations.push({
          type: 'scene_duration_too_short',
          severity: 'soft',
          message: '场景时长过短（< 1 秒）',
          details: { duration: newDuration },
        });
      }
    }

    return violations;
  }

  /**
   * 检查贴片时机变更
   */
  private checkOverlayTiming(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查贴片显示时机
    if (change.showAt < 0) {
      violations.push({
        type: 'invalid_overlay_timing',
        severity: 'hard',
        message: '贴片显示时机不能为负数',
        details: { showAt: change.showAt },
      });
    }

    // 检查贴片是否遮挡关键内容
    if (change.overlay === 'buy_button' && change.showAt < 2000) {
      violations.push({
        type: 'overlay_too_early',
        severity: 'soft',
        message: '购买按钮显示过早，可能影响用户体验',
        details: { showAt: change.showAt },
      });
    }

    return violations;
  }

  /**
   * 检查转场速度变更
   */
  private checkTransitionSpeed(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查转场时长
    if (change.duration < 200) {
      violations.push({
        type: 'transition_too_fast',
        severity: 'soft',
        message: '转场速度过快（< 200ms），可能导致视觉跳跃',
        details: { duration: change.duration },
      });
    }

    if (change.duration > 3000) {
      violations.push({
        type: 'transition_too_slow',
        severity: 'soft',
        message: '转场速度过慢（> 3 秒），可能影响节奏',
        details: { duration: change.duration },
      });
    }

    return violations;
  }

  /**
   * 检查文字内容变更
   */
  private checkTextContent(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查文字长度
    if (change.content && change.content.length > 100) {
      violations.push({
        type: 'text_too_long',
        severity: 'soft',
        message: '文字内容过长（> 100 字符），可能影响显示',
        details: { length: change.content.length },
      });
    }

    // 检查敏感词（简化版）
    const sensitiveWords = ['违禁词', '敏感词']; // 实际应用中应该有完整的敏感词库
    if (change.content && sensitiveWords.some(word => change.content.includes(word))) {
      violations.push({
        type: 'sensitive_content',
        severity: 'hard',
        message: '文字内容包含敏感词',
        details: { content: change.content },
      });
    }

    return violations;
  }

  /**
   * 检查场景顺序变更
   */
  private checkSceneOrder(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查场景顺序是否合理
    // 例如：不能跳过 Hook 直接进入 CTA
    if (change.order && change.order[0] !== 'hook') {
      violations.push({
        type: 'invalid_scene_order',
        severity: 'soft',
        message: '场景顺序应以 Hook 开始',
        details: { order: change.order },
      });
    }

    return violations;
  }

  /**
   * 检查回复模板变更
   */
  private checkResponseTemplate(mutation: Mutation, context?: any): Violation[] {
    const violations: Violation[] = [];
    const change = mutation.change;

    // 检查回复长度
    if (change.template && change.template.length > 200) {
      violations.push({
        type: 'response_too_long',
        severity: 'soft',
        message: '回复内容过长（> 200 字符）',
        details: { length: change.template.length },
      });
    }

    return violations;
  }

  /**
   * 检查变更步长
   */
  private checkMutationStepSize(mutation: Mutation): Violation[] {
    const violations: Violation[] = [];

    // 计算变更幅度
    const stepSize = this.calculateStepSize(mutation);

    if (stepSize > this.config.mutationStepSizeMax) {
      violations.push({
        type: 'mutation_step_too_large',
        severity: 'hard',
        message: `变更步长过大（${stepSize.toFixed(2)} > ${this.config.mutationStepSizeMax}）`,
        details: { stepSize },
      });
    }

    return violations;
  }

  /**
   * 计算变更步长
   */
  private calculateStepSize(mutation: Mutation): number {
    const change = mutation.change;

    switch (mutation.type) {
      case 'scene_duration':
        return Math.abs(change.delta || 0) / 10000; // 归一化到 0-1

      case 'overlay_timing':
        return Math.abs(change.showAt || 0) / 10000;

      case 'transition_speed':
        return Math.abs((change.duration || 1000) - 1000) / 3000;

      default:
        return 0.1; // 默认步长
    }
  }
}

/**
 * 导出便捷函数
 */
export function createInvariantGate(config?: Partial<InvariantGateConfig>): InvariantGate {
  return new InvariantGate(config);
}
