/**
 * Data Quality Validator
 * 核心职责：验证事件数据质量，过滤无效数据
 */

import {
  LiveEvent,
  CommentEvent,
  LikeEvent,
  GiftEvent,
} from '../types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  score?: number; // 数据质量评分 0-1
}

export interface DataQualityMetrics {
  totalEvents: number;
  validEvents: number;
  invalidEvents: number;
  avgQualityScore: number;
  errors: string[];
}

/**
 * 数据质量验证器类
 */
export class DataQualityValidator {
  private metrics: DataQualityMetrics = {
    totalEvents: 0,
    validEvents: 0,
    invalidEvents: 0,
    avgQualityScore: 0,
    errors: [],
  };

  /**
   * 验证单个事件
   */
  validate(event: LiveEvent): ValidationResult {
    this.metrics.totalEvents++;

    // 基础验证
    const baseValidation = this.validateBase(event);
    if (!baseValidation.valid) {
      this.metrics.invalidEvents++;
      this.metrics.errors.push(baseValidation.reason || 'Unknown error');
      return baseValidation;
    }

    // 类型特定验证
    const typeValidation = this.validateByType(event);
    if (!typeValidation.valid) {
      this.metrics.invalidEvents++;
      this.metrics.errors.push(typeValidation.reason || 'Unknown error');
      return typeValidation;
    }

    // 计算质量评分
    const score = this.calculateQualityScore(event);

    this.metrics.validEvents++;
    this.updateAvgQualityScore(score);

    return {
      valid: true,
      score,
    };
  }

  /**
   * 批量验证事件
   */
  validateBatch(events: LiveEvent[]): ValidationResult[] {
    return events.map(event => this.validate(event));
  }

  /**
   * 过滤有效事件
   */
  filterValid(events: LiveEvent[]): LiveEvent[] {
    return events.filter(event => this.validate(event).valid);
  }

  /**
   * 获取数据质量指标
   */
  getMetrics(): DataQualityMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      totalEvents: 0,
      validEvents: 0,
      invalidEvents: 0,
      avgQualityScore: 0,
      errors: [],
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 基础验证
   */
  private validateBase(event: LiveEvent): ValidationResult {
    // 检查必需字段
    if (!event.eventId) {
      return { valid: false, reason: '缺少 eventId' };
    }

    if (!event.eventType) {
      return { valid: false, reason: '缺少 eventType' };
    }

    if (!event.timestamp || event.timestamp <= 0) {
      return { valid: false, reason: '无效的 timestamp' };
    }

    if (!event.sessionId) {
      return { valid: false, reason: '缺少 sessionId' };
    }

    // 检查时间戳是否合理（不能是未来时间）
    if (event.timestamp > Date.now() + 60000) {
      return { valid: false, reason: 'timestamp 是未来时间' };
    }

    // 检查时间戳是否太旧（超过 1 小时）
    if (event.timestamp < Date.now() - 3600000) {
      return { valid: false, reason: 'timestamp 太旧（超过 1 小时）' };
    }

    return { valid: true };
  }

  /**
   * 按类型验证
   */
  private validateByType(event: LiveEvent): ValidationResult {
    switch (event.eventType) {
      case 'comment':
        return this.validateComment(event as CommentEvent);

      case 'like':
        return this.validateLike(event as LikeEvent);

      case 'gift':
        return this.validateGift(event as GiftEvent);

      case 'user_enter':
      case 'exit':
      case 'click_cart':
      case 'replay':
        return { valid: true };

      default: {
        const eventType = (event as any).eventType;
        return { valid: false, reason: `未知事件类型: ${eventType}` };
      }
    }
  }

  /**
   * 验证评论事件
   */
  private validateComment(event: CommentEvent): ValidationResult {
    if (!event.userId) {
      return { valid: false, reason: '评论事件缺少 userId' };
    }

    if (!event.content || event.content.trim().length === 0) {
      return { valid: false, reason: '评论内容为空' };
    }

    // 检查评论长度（太长可能是异常）
    if (event.content.length > 1000) {
      return { valid: false, reason: '评论内容过长（> 1000 字符）' };
    }

    return { valid: true };
  }

  /**
   * 验证点赞事件
   */
  private validateLike(event: LikeEvent): ValidationResult {
    if (!event.userId) {
      return { valid: false, reason: '点赞事件缺少 userId' };
    }

    if (!event.count || event.count <= 0) {
      return { valid: false, reason: '点赞数量无效' };
    }

    // 检查点赞数量是否合理
    if (event.count > 100) {
      return { valid: false, reason: '点赞数量异常（> 100）' };
    }

    return { valid: true };
  }

  /**
   * 验证礼物事件
   */
  private validateGift(event: GiftEvent): ValidationResult {
    if (!event.userId) {
      return { valid: false, reason: '礼物事件缺少 userId' };
    }

    if (!event.giftId) {
      return { valid: false, reason: '礼物事件缺少 giftId' };
    }

    if (event.value === undefined || event.value < 0) {
      return { valid: false, reason: '礼物价值无效' };
    }

    return { valid: true };
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(event: LiveEvent): number {
    let score = 1.0;

    // 评论事件的质量评分
    if (event.eventType === 'comment') {
      const comment = event as CommentEvent;

      // 评论长度适中（10-100 字符）得高分
      if (comment.content.length >= 10 && comment.content.length <= 100) {
        score *= 1.0;
      } else if (comment.content.length < 10) {
        score *= 0.8; // 太短
      } else {
        score *= 0.9; // 太长
      }

      // 包含用户名得高分
      if (comment.userName && comment.userName !== '匿名用户') {
        score *= 1.0;
      } else {
        score *= 0.9;
      }
    }

    // 点赞事件的质量评分
    if (event.eventType === 'like') {
      const like = event as LikeEvent;

      // 点赞数量合理（1-10）得高分
      if (like.count >= 1 && like.count <= 10) {
        score *= 1.0;
      } else {
        score *= 0.9;
      }
    }

    // 礼物事件的质量评分
    if (event.eventType === 'gift') {
      const gift = event as GiftEvent;

      // 包含礼物名称得高分
      if (gift.giftName && gift.giftName !== '礼物') {
        score *= 1.0;
      } else {
        score *= 0.9;
      }

      // 包含用户名得高分
      if (gift.userName && gift.userName !== '匿名用户') {
        score *= 1.0;
      } else {
        score *= 0.9;
      }
    }

    return score;
  }

  /**
   * 更新平均质量评分
   */
  private updateAvgQualityScore(newScore: number): void {
    const totalValidEvents = this.metrics.validEvents;
    const oldAvg = this.metrics.avgQualityScore;

    // 增量更新平均值
    this.metrics.avgQualityScore = oldAvg + (newScore - oldAvg) / totalValidEvents;
  }
}

/**
 * 导出便捷函数
 */
export function createDataQualityValidator(): DataQualityValidator {
  return new DataQualityValidator();
}
