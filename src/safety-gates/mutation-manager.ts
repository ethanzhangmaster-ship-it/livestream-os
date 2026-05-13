/**
 * Mutation Manager
 * 核心职责：整合 Optimizer、Knowledge Graph、Safety Gates，管理变更生命周期
 * 
 * 完整链路：
 * Optimizer → Knowledge Graph → Invariant Gate → Stability Gate → Convergence Controller → Apply
 */

import { Optimizer, MutationProposal, ImpactAnalysis } from '../optimizer';
import { KnowledgeGraph, ContextFingerprint, generateContextFingerprint } from '../knowledge-graph';
import { InvariantGate, InvariantCheckResult } from './invariant-gate';
import { StabilityGate, StabilityCheckResult } from './stability-gate';
import { ConvergenceController, ConvergenceState } from './convergence-controller';
import { Mutation, AttentionState, Intent, RuntimeDecision } from '../types';

export interface MutationResult {
  mutation: Mutation;
  approved: boolean;
  invariantCheck: InvariantCheckResult;
  stabilityCheck: StabilityCheckResult;
  convergenceState: ConvergenceState;
  impact?: ImpactAnalysis;
  reason: string;
}

export interface MutationManagerConfig {
  enableKnowledgeGraph: boolean;
  enableSafetyGates: boolean;
  enableConvergenceControl: boolean;
  autoApply: boolean; // 是否自动应用批准的变更
}

const DEFAULT_CONFIG: MutationManagerConfig = {
  enableKnowledgeGraph: true,
  enableSafetyGates: true,
  enableConvergenceControl: true,
  autoApply: false,
};

/**
 * Mutation Manager 类
 */
export class MutationManager {
  private config: MutationManagerConfig;
  private optimizer: Optimizer;
  private knowledgeGraph: KnowledgeGraph;
  private invariantGate: InvariantGate;
  private stabilityGate: StabilityGate;
  private convergenceController: ConvergenceController;
  private mutationHistory: MutationResult[] = [];

  constructor(config: Partial<MutationManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.optimizer = new Optimizer();
    this.knowledgeGraph = new KnowledgeGraph();
    this.invariantGate = new InvariantGate();
    this.stabilityGate = new StabilityGate();
    this.convergenceController = new ConvergenceController();
  }

  /**
   * 提议变更
   */
  propose(
    attentionState: AttentionState,
    intent: Intent | null,
    sessionDuration: number
  ): MutationProposal | null {
    // 生成上下文指纹
    const context = generateContextFingerprint(attentionState, intent, sessionDuration);

    // 从 Optimizer 获取提议
    const proposal = this.optimizer.proposeMutation(
      attentionState,
      this.config.enableKnowledgeGraph ? this.knowledgeGraph : undefined
    );

    return proposal;
  }

  /**
   * 评估变更
   */
  evaluate(mutation: Mutation, context?: any): MutationResult {
    // 1. Invariant Gate 检查
    const invariantCheck = this.config.enableSafetyGates
      ? this.invariantGate.check(mutation, context)
      : { allowed: true, violations: [], hardViolations: [], softViolations: [] };

    // 2. Stability Gate 检查
    const stabilityCheck = this.config.enableSafetyGates
      ? this.stabilityGate.check(mutation)
      : { stable: true, violations: [], oscillationRisk: 0, recentMutations: 0 };

    // 3. Convergence Controller 检查
    const convergenceState = this.config.enableConvergenceControl
      ? this.convergenceController.getState()
      : { score: 0, isConverged: false, iterations: 0, recentImpacts: [], trend: 'stable' as const };

    // 决定是否批准
    const approved =
      invariantCheck.allowed &&
      stabilityCheck.stable &&
      (this.config.enableConvergenceControl ? this.convergenceController.shouldContinue() : true);

    // 生成原因
    const reason = this.generateReason(invariantCheck, stabilityCheck, convergenceState);

    const result: MutationResult = {
      mutation,
      approved,
      invariantCheck,
      stabilityCheck,
      convergenceState,
      reason,
    };

    // 记录历史
    this.mutationHistory.push(result);

    return result;
  }

  /**
   * 应用变更
   */
  apply(mutation: Mutation, impact: number): void {
    // 记录到 Stability Gate
    if (this.config.enableSafetyGates) {
      this.stabilityGate.recordMutation(mutation, impact);
    }

    // 记录到 Convergence Controller
    if (this.config.enableConvergenceControl) {
      this.convergenceController.recordImpact(impact);
    }

    // 记录到 Knowledge Graph
    if (this.config.enableKnowledgeGraph) {
      // TODO: 需要上下文信息
      // this.knowledgeGraph.recordPattern(mutation, context, impact);
    }
  }

  /**
   * 分析影响
   */
  analyzeImpact(
    decision: RuntimeDecision,
    attentionBefore: AttentionState,
    attentionAfter: AttentionState
  ): ImpactAnalysis {
    return this.optimizer.analyzeImpact(decision, attentionBefore, attentionAfter);
  }

  /**
   * 获取历史
   */
  getHistory(): MutationResult[] {
    return this.mutationHistory.slice();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalMutations: number;
    approvedMutations: number;
    rejectedMutations: number;
    avgImpact: number;
    convergenceScore: number;
  } {
    const total = this.mutationHistory.length;
    const approved = this.mutationHistory.filter(r => r.approved).length;
    const rejected = total - approved;
    const avgImpact = this.optimizer.getAverageImpact();
    const convergenceScore = this.convergenceController.getState().score;

    return {
      totalMutations: total,
      approvedMutations: approved,
      rejectedMutations: rejected,
      avgImpact,
      convergenceScore,
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.mutationHistory = [];
    this.optimizer.clearHistory();
    this.stabilityGate.clearHistory();
    this.convergenceController.reset();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 生成原因说明
   */
  private generateReason(
    invariantCheck: InvariantCheckResult,
    stabilityCheck: StabilityCheckResult,
    convergenceState: ConvergenceState
  ): string {
    const reasons: string[] = [];

    if (!invariantCheck.allowed) {
      const hardViolations = invariantCheck.hardViolations.map(v => v.message).join('; ');
      reasons.push(`Invariant violation: ${hardViolations}`);
    }

    if (!stabilityCheck.stable) {
      const violations = stabilityCheck.violations.map(v => v.message).join('; ');
      reasons.push(`Stability issue: ${violations}`);
    }

    if (convergenceState.isConverged) {
      reasons.push('System converged');
    }

    if (reasons.length === 0) {
      return 'Approved';
    }

    return reasons.join(' | ');
  }
}

/**
 * 导出便捷函数
 */
export function createMutationManager(config?: Partial<MutationManagerConfig>): MutationManager {
  return new MutationManager(config);
}
