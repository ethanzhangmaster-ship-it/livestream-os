/**
 * Optimizer
 * 核心职责：分析变更影响，提出优化建议
 * 
 * 关键算法：
 * - Impact integral: Impact(m) = ∫ [A(t) - A_prior(t)] * kernel(t - t_m) dt
 * - Shapley Value for overlapping mutations
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Mutation,
  AttentionState,
  RuntimeDecision,
  Action,
} from '../types';

export interface ImpactAnalysis {
  mutationId: string;
  impact: number; // 影响值 (-1 to 1)
  confidence: number; // 置信度 (0 to 1)
  correlation: number; // 相关性 (-1 to 1)
  attentionBefore: number;
  attentionAfter: number;
  timestamp: number;
}

export interface MutationProposal {
  mutation: Mutation;
  reasoning: string;
  expectedImpact: number;
  confidence: number;
  basedOn: 'pattern' | 'heuristic' | 'random';
}

export interface OptimizerConfig {
  impactThreshold: number; // 影响阈值，低于此值的 mutation 不推荐
  minConfidence: number; // 最小置信度
  explorationRate: number; // 探索率 (0-1)，用于随机探索
}

const DEFAULT_CONFIG: OptimizerConfig = {
  impactThreshold: 0.1,
  minConfidence: 0.5,
  explorationRate: 0.1,
};

/**
 * Optimizer 类
 */
export class Optimizer {
  private config: OptimizerConfig;
  private impactHistory: ImpactAnalysis[] = [];
  private attentionBaseline: number = 0.5;

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 分析变更影响
   */
  analyzeImpact(
    decision: RuntimeDecision,
    attentionBefore: AttentionState,
    attentionAfter: AttentionState
  ): ImpactAnalysis {
    const mutationId = uuidv4();

    // 计算注意力变化
    const deltaAttention = attentionAfter.density - attentionBefore.density;

    // 计算影响积分（简化版）
    const impact = this.calculateImpactIntegral(
      attentionBefore.density,
      attentionAfter.density,
      decision.timestamp
    );

    // 计算置信度（基于注意力变化幅度）
    const confidence = this.calculateConfidence(deltaAttention);

    // 计算相关性（简化版：假设正相关）
    const correlation = deltaAttention > 0 ? 0.8 : -0.5;

    const analysis: ImpactAnalysis = {
      mutationId,
      impact,
      confidence,
      correlation,
      attentionBefore: attentionBefore.density,
      attentionAfter: attentionAfter.density,
      timestamp: Date.now(),
    };

    // 记录历史
    this.impactHistory.push(analysis);

    // 更新基线
    this.updateBaseline(attentionAfter.density);

    return analysis;
  }

  /**
   * 提出变更建议
   */
  proposeMutation(
    currentState: AttentionState,
    knowledgeGraph?: any
  ): MutationProposal | null {
    // 如果有知识图谱，优先使用模式匹配
    if (knowledgeGraph) {
      const patternProposal = this.proposeFromPattern(currentState, knowledgeGraph);
      if (patternProposal) {
        return patternProposal;
      }
    }

    // 使用启发式规则
    const heuristicProposal = this.proposeFromHeuristic(currentState);
    if (heuristicProposal) {
      return heuristicProposal;
    }

    // 随机探索（探索率控制）
    if (Math.random() < this.config.explorationRate) {
      return this.proposeRandom(currentState);
    }

    return null;
  }

  /**
   * 批量分析影响
   */
  analyzeBatch(
    decisions: RuntimeDecision[],
    attentionStates: AttentionState[]
  ): ImpactAnalysis[] {
    const analyses: ImpactAnalysis[] = [];

    for (let i = 0; i < decisions.length; i++) {
      if (i === 0) continue; // 第一个决策没有前置状态

      const before = attentionStates[i - 1];
      const after = attentionStates[i];
      const decision = decisions[i];

      const analysis = this.analyzeImpact(decision, before, after);
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * 获取影响历史
   */
  getImpactHistory(): ImpactAnalysis[] {
    return this.impactHistory.slice();
  }

  /**
   * 获取平均影响
   */
  getAverageImpact(): number {
    if (this.impactHistory.length === 0) return 0;

    const sum = this.impactHistory.reduce((acc, a) => acc + a.impact, 0);
    return sum / this.impactHistory.length;
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.impactHistory = [];
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 计算影响积分
   * 简化版：使用注意力变化的加权和
   */
  private calculateImpactIntegral(
    attentionBefore: number,
    attentionAfter: number,
    timestamp: number
  ): number {
    const delta = attentionAfter - attentionBefore;

    // 时间衰减因子（越近的影响权重越高）
    const age = Date.now() - timestamp;
    const timeDecay = Math.exp(-age / 60000); // 1 分钟半衰期

    // 影响积分 = 注意力变化 * 时间衰减
    return delta * timeDecay;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(deltaAttention: number): number {
    // 变化幅度越大，置信度越高
    const magnitude = Math.abs(deltaAttention);
    
    if (magnitude > 0.3) return 0.9;
    if (magnitude > 0.2) return 0.8;
    if (magnitude > 0.1) return 0.7;
    if (magnitude > 0.05) return 0.6;
    
    return 0.5;
  }

  /**
   * 更新基线
   */
  private updateBaseline(currentAttention: number): void {
    // 指数移动平均
    const alpha = 0.1;
    this.attentionBaseline = alpha * currentAttention + (1 - alpha) * this.attentionBaseline;
  }

  /**
   * 从模式提出变更建议
   */
  private proposeFromPattern(
    currentState: AttentionState,
    knowledgeGraph: any
  ): MutationProposal | null {
    // TODO: 实现基于知识图谱的模式匹配
    // 1. 生成当前状态的上下文指纹
    // 2. 在知识图谱中查找相似模式
    // 3. 返回历史表现最好的变更
    
    return null;
  }

  /**
   * 从启发式规则提出变更建议
   */
  private proposeFromHeuristic(currentState: AttentionState): MutationProposal | null {
    // 规则 1: 流失风险 → 缩短 Hook
    if (currentState.pattern === 'drop_risk' && currentState.density < 0.3) {
      return {
        mutation: {
          mutationId: uuidv4(),
          type: 'scene_duration',
          change: { scene: 'hook', delta: -1000 }, // 缩短 1 秒
          proposer: 'optimizer',
          expectedImpact: 0.3,
          confidence: 0.7,
          timestamp: Date.now(),
        },
        reasoning: '流失风险高，缩短 Hook 场景时长',
        expectedImpact: 0.3,
        confidence: 0.7,
        basedOn: 'heuristic',
      };
    }

    // 规则 2: 高互动 → 延长当前场景
    if (currentState.pattern === 'engagement_high' && currentState.momentum > 0.1) {
      return {
        mutation: {
          mutationId: uuidv4(),
          type: 'scene_duration',
          change: { scene: 'current', delta: 2000 }, // 延长 2 秒
          proposer: 'optimizer',
          expectedImpact: 0.2,
          confidence: 0.6,
          timestamp: Date.now(),
        },
        reasoning: '高互动状态，延长当前场景',
        expectedImpact: 0.2,
        confidence: 0.6,
        basedOn: 'heuristic',
      };
    }

    // 规则 3: 价格敏感话题 → 提前显示优惠
    if (currentState.topic === 'price' && currentState.density > 0.5) {
      return {
        mutation: {
          mutationId: uuidv4(),
          type: 'overlay_timing',
          change: { overlay: 'discount_badge', showAt: 0 }, // 立即显示
          proposer: 'optimizer',
          expectedImpact: 0.4,
          confidence: 0.8,
          timestamp: Date.now(),
        },
        reasoning: '价格敏感话题，提前显示优惠贴片',
        expectedImpact: 0.4,
        confidence: 0.8,
        basedOn: 'heuristic',
      };
    }

    return null;
  }

  /**
   * 随机提出变更建议（探索）
   */
  private proposeRandom(currentState: AttentionState): MutationProposal {
    const mutationTypes = ['scene_duration', 'overlay_timing', 'transition_speed'];
    const type = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];

    let change: Record<string, any> = {};

    switch (type) {
      case 'scene_duration':
        change = { scene: 'current', delta: (Math.random() - 0.5) * 4000 };
        break;
      case 'overlay_timing':
        change = { overlay: 'random_overlay', showAt: Math.random() * 5000 };
        break;
      case 'transition_speed':
        change = { from: 'current', to: 'next', duration: 500 + Math.random() * 1500 };
        break;
    }

    return {
      mutation: {
        mutationId: uuidv4(),
        type: type as any,
        change,
        proposer: 'optimizer',
        expectedImpact: 0,
        confidence: 0.3,
        timestamp: Date.now(),
      },
      reasoning: '随机探索',
      expectedImpact: 0,
      confidence: 0.3,
      basedOn: 'random',
    };
  }
}

/**
 * 导出便捷函数
 */
export function createOptimizer(config?: Partial<OptimizerConfig>): Optimizer {
  return new Optimizer(config);
}
