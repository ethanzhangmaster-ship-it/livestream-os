/**
 * Knowledge Graph
 * 核心职责：存储、匹配、聚合历史模式
 * 
 * 关键算法：
 * - Welford's algorithm for online statistics
 * - Context fingerprinting with quantized features
 */

import Database from 'better-sqlite3';
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

export interface KnowledgeGraphConfig {
  dbPath: string;
  minSampleCount: number; // 最小样本数
  confidenceThreshold: number; // 置信度阈值
}

const DEFAULT_CONFIG: KnowledgeGraphConfig = {
  dbPath: ':memory:', // 默认使用内存数据库
  minSampleCount: 3,
  confidenceThreshold: 0.6,
};

/**
 * Knowledge Graph 类
 */
export class KnowledgeGraph {
  private config: KnowledgeGraphConfig;
  private db: Database.Database;

  constructor(config: Partial<KnowledgeGraphConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = new Database(this.config.dbPath);
    this.initializeDatabase();
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
   * 匹配模式
   */
  matchPattern(
    mutationType: string,
    context: ContextFingerprint
  ): Pattern | null {
    const contextHash = this.hashContext(context);

    const stmt = this.db.prepare(`
      SELECT * FROM patterns
      WHERE mutation_type = ? AND context_hash = ?
      AND sample_count >= ?
      AND confidence >= ?
    `);

    const row = stmt.get(
      mutationType,
      contextHash,
      this.config.minSampleCount,
      this.config.confidenceThreshold
    ) as any;

    if (!row) return null;

    return this.rowToPattern(row);
  }

  /**
   * 获取最佳模式
   */
  getBestPatterns(
    context: ContextFingerprint,
    limit: number = 5
  ): Pattern[] {
    const contextHash = this.hashContext(context);

    const stmt = this.db.prepare(`
      SELECT * FROM patterns
      WHERE context_hash = ?
      AND sample_count >= ?
      AND confidence >= ?
      ORDER BY avg_impact DESC
      LIMIT ?
    `);

    const rows = stmt.all(
      contextHash,
      this.config.minSampleCount,
      this.config.confidenceThreshold,
      limit
    ) as any[];

    return rows.map(row => this.rowToPattern(row));
  }

  /**
   * 获取所有模式
   */
  getAllPatterns(): Pattern[] {
    const stmt = this.db.prepare('SELECT * FROM patterns ORDER BY avg_impact DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToPattern(row));
  }

  /**
   * 获取数据库实例
   */
  getDB(): Database.Database {
    return this.db;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalPatterns: number;
    totalSamples: number;
    avgImpact: number;
    avgConfidence: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_patterns,
        SUM(sample_count) as total_samples,
        AVG(avg_impact) as avg_impact,
        AVG(confidence) as avg_confidence
      FROM patterns
    `);

    const row = stmt.get() as any;

    return {
      totalPatterns: row.total_patterns || 0,
      totalSamples: row.total_samples || 0,
      avgImpact: row.avg_impact || 0,
      avgConfidence: row.avg_confidence || 0,
    };
  }

  /**
   * 清空所有模式
   */
  clear(): void {
    this.db.exec('DELETE FROM patterns');
  }

  /**
   * 关闭数据库
   */
  close(): void {
    this.db.close();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 初始化数据库
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        pattern_id TEXT PRIMARY KEY,
        mutation_type TEXT NOT NULL,
        context_hash TEXT NOT NULL,
        avg_impact REAL NOT NULL,
        variance REAL NOT NULL,
        sample_count INTEGER NOT NULL,
        confidence REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mutation_type ON patterns(mutation_type);
      CREATE INDEX IF NOT EXISTS idx_context_hash ON patterns(context_hash);
      CREATE INDEX IF NOT EXISTS idx_avg_impact ON patterns(avg_impact DESC);
    `);
  }

  /**
   * 查找模式
   */
  private findPattern(mutationType: string, contextHash: string): string | null {
    const stmt = this.db.prepare(`
      SELECT pattern_id FROM patterns
      WHERE mutation_type = ? AND context_hash = ?
    `);

    const row = stmt.get(mutationType, contextHash) as any;
    return row ? row.pattern_id : null;
  }

  /**
   * 创建模式
   */
  private createPattern(mutationType: string, contextHash: string, impact: number): void {
    const patternId = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO patterns (
        pattern_id, mutation_type, context_hash,
        avg_impact, variance, sample_count, confidence,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      patternId,
      mutationType,
      contextHash,
      impact,
      0, // 初始方差为 0
      1, // 初始样本数为 1
      0.5, // 初始置信度为 0.5
      now,
      now
    );
  }

  /**
   * 更新模式（使用 Welford's algorithm）
   */
  private updatePattern(patternId: string, newImpact: number): void {
    // 获取当前值
    const getStmt = this.db.prepare(`
      SELECT avg_impact, variance, sample_count
      FROM patterns
      WHERE pattern_id = ?
    `);

    const row = getStmt.get(patternId) as any;
    if (!row) return;

    const oldAvg = row.avg_impact;
    const oldVariance = row.variance;
    const oldCount = row.sample_count;

    // Welford's algorithm for online mean and variance
    const newCount = oldCount + 1;
    const delta = newImpact - oldAvg;
    const newAvg = oldAvg + delta / newCount;
    const delta2 = newImpact - newAvg;
    const newVariance = oldVariance + delta * delta2;

    // 计算置信度
    const confidence = this.calculateConfidence(newCount, newVariance);

    // 更新数据库
    const updateStmt = this.db.prepare(`
      UPDATE patterns
      SET avg_impact = ?, variance = ?, sample_count = ?, confidence = ?, updated_at = ?
      WHERE pattern_id = ?
    `);

    updateStmt.run(newAvg, newVariance, newCount, confidence, Date.now(), patternId);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(sampleCount: number, variance: number): number {
    // 样本量因子：样本越多，置信度越高
    const sampleSizeFactor = Math.min(sampleCount / 10, 1);

    // 方差因子：方差越小，置信度越高
    const cvFactor = variance > 0 ? Math.exp(-variance) : 1;

    return sampleSizeFactor * cvFactor;
  }

  /**
   * 哈希上下文
   */
  private hashContext(context: ContextFingerprint): string {
    // 量化特征
    const quantizedDensity = Math.floor(context.attentionDensity * 10) / 10;
    const quantizedPhase = context.sessionPhase;

    // 生成哈希
    const features = [
      quantizedDensity.toFixed(1),
      context.attentionPattern,
      context.topic || 'none',
      context.intentType || 'none',
      quantizedPhase,
    ];

    return features.join('|');
  }

  /**
   * 数据库行转 Pattern 对象
   */
  private rowToPattern(row: any): Pattern {
    return {
      patternId: row.pattern_id,
      mutationType: row.mutation_type,
      contextHash: row.context_hash,
      avgImpact: row.avg_impact,
      variance: row.variance,
      sampleCount: row.sample_count,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * 导出便捷函数
 */
export function createKnowledgeGraph(config?: Partial<KnowledgeGraphConfig>): KnowledgeGraph {
  return new KnowledgeGraph(config);
}

/**
 * 从 AttentionState 和 Intent 生成 ContextFingerprint
 */
export function generateContextFingerprint(
  attentionState: AttentionState,
  intent: Intent | null,
  sessionDuration: number
): ContextFingerprint {
  // 确定会话阶段
  let sessionPhase: 'early' | 'middle' | 'late';
  if (sessionDuration < 300000) { // 5 分钟
    sessionPhase = 'early';
  } else if (sessionDuration < 900000) { // 15 分钟
    sessionPhase = 'middle';
  } else {
    sessionPhase = 'late';
  }

  return {
    attentionDensity: attentionState.density,
    attentionPattern: attentionState.pattern,
    topic: attentionState.topic || 'none',
    intentType: intent?.type || 'none',
    sessionPhase,
  };
}
