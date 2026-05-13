/**
 * Knowledge Graph (内存版本)
 * 核心职责：存储、匹配、聚合历史模式
 * 
 * 关键算法：
 * - Welford's algorithm for online statistics
 * - Context fingerprinting with quantized features
 */

import { v4 as uuidv4 } from 'uuid';
import { AttentionState, Mutation, Intent } from '../types';

export interface Pattern {
  patternId: string;
  mutationType: string;
  contextHash: string;
  avgImpact: number;
  variance: number;
  sampleCount: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContextFingerprint {
  attentionDensity: number; // 量化后的注意力密度
  attentionPattern: string;
  topic: string;
  intentType: string;
  sessionPhase: 'early' | 'middle' | 'late';
}

/**
 * 生成上下文指纹
 */
export function generateContextFingerprint(
  attentionState: AttentionState,
  intent: Intent,
  sessionDuration: number
): ContextFingerprint {
  // 量化注意力密度
  const attentionDensity = Math.floor(attentionState.density * 10) / 10;
  
  // 判断注意力模式
  let attentionPattern = 'stable';
  if (attentionState.momentum > 0.1) {
    attentionPattern = 'rising';
  } else if (attentionState.momentum < -0.1) {
    attentionPattern = 'falling';
  }
  
  // 判断会话阶段
  let sessionPhase: 'early' | 'middle' | 'late' = 'middle';
  if (sessionDuration < 300000) { // 5 分钟
    sessionPhase = 'early';
  } else if (sessionDuration > 1800000) { // 30 分钟
    sessionPhase = 'late';
  }
  
  return {
    attentionDensity,
    attentionPattern,
    topic: attentionState.topic || 'general',
    intentType: intent.type,
    sessionPhase,
  };
}

export interface KnowledgeGraphConfig {
  minSampleCount: number; // 最小样本数
  confidenceThreshold: number; // 置信度阈值
}

const DEFAULT_CONFIG: KnowledgeGraphConfig = {
  minSampleCount: 3,
  confidenceThreshold: 0.6,
};

/**
 * Knowledge Graph 类（内存版本）
 */
export class KnowledgeGraph {
  private config: KnowledgeGraphConfig;
  private patterns: Map<string, Pattern> = new Map();

  constructor(config: Partial<KnowledgeGraphConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录模式
   */
  recordPattern(
    mutation: Mutation,
    context: ContextFingerprint,
    impact: number
  ): void {
    const contextHash = this.hashContext(context);
    const patternId = this.findPattern(mutation.type, contextHash);

    if (patternId) {
      // 更新现有模式
      this.updatePattern(patternId, impact);
    } else {
      // 创建新模式
      this.createPattern(mutation.type, contextHash, impact);
    }
  }

  /**
   * 查找模式
   */
  findPattern(mutationType: string, contextHash: string): string | null {
    for (const [id, pattern] of this.patterns) {
      if (pattern.mutationType === mutationType && pattern.contextHash === contextHash) {
        return id;
      }
    }
    return null;
  }

  /**
   * 创建新模式
   */
  private createPattern(mutationType: string, contextHash: string, impact: number): void {
    const patternId = uuidv4();
    const now = Date.now();

    this.patterns.set(patternId, {
      patternId,
      mutationType,
      contextHash,
      avgImpact: impact,
      variance: 0,
      sampleCount: 1,
      confidence: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 更新模式（使用 Welford's algorithm）
   */
  private updatePattern(patternId: string, newImpact: number): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    const n = pattern.sampleCount + 1;
    const delta = newImpact - pattern.avgImpact;
    const newAvg = pattern.avgImpact + delta / n;
    const newVariance = pattern.variance + delta * (newImpact - newAvg);

    pattern.avgImpact = newAvg;
    pattern.variance = newVariance;
    pattern.sampleCount = n;
    pattern.confidence = this.calculateConfidence(n, newVariance);
    pattern.updatedAt = Date.now();

    this.patterns.set(patternId, pattern);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(sampleCount: number, variance: number): number {
    if (sampleCount < this.config.minSampleCount) {
      return 0;
    }

    const sampleSizeFactor = Math.min(1, sampleCount / 10);
    const cv = Math.sqrt(variance / sampleCount) / (sampleCount > 0 ? 1 : 1);
    const cvFactor = Math.max(0, 1 - cv);

    return sampleSizeFactor * cvFactor;
  }

  /**
   * 匹配模式
   */
  matchPatterns(context: ContextFingerprint): Pattern[] {
    const contextHash = this.hashContext(context);
    const matches: Pattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.contextHash === contextHash && pattern.confidence >= this.config.confidenceThreshold) {
        matches.push(pattern);
      }
    }

    return matches.sort((a, b) => b.avgImpact - a.avgImpact);
  }

  /**
   * 推荐策略
   */
  recommendStrategy(context: ContextFingerprint): string | null {
    const matches = this.matchPatterns(context);

    if (matches.length === 0) {
      return null;
    }

    // 返回平均影响最高的策略
    return matches[0].mutationType;
  }

  /**
   * 哈希上下文
   */
  private hashContext(context: ContextFingerprint): string {
    const parts = [
      Math.floor(context.attentionDensity * 10).toString(),
      context.attentionPattern,
      context.topic,
      context.intentType,
      context.sessionPhase,
    ];
    return parts.join(':');
  }

  /**
   * 获取所有模式
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * 清空所有模式
   */
  clear(): void {
    this.patterns.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalPatterns: number; avgConfidence: number } {
    const patterns = Array.from(this.patterns.values());
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      avgConfidence,
    };
  }
}
