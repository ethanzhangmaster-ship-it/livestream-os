/**
 * Attention Bus
 * 核心职责：聚合原始事件流，计算注意力状态
 */

import { Subject, Observable, BehaviorSubject } from 'rxjs';
import {
  LiveEvent,
  AttentionState,
  AttentionPattern,
  CommentEvent,
  LikeEvent,
  GiftEvent,
  ExitEvent,
} from '../types';

export interface AttentionBusConfig {
  aggregationWindowMs: number; // 聚合时间窗口
  momentumWindowMs: number; // 动量计算窗口
  minEventsForPattern: number; // 识别模式所需最小事件数
}

const DEFAULT_CONFIG: AttentionBusConfig = {
  aggregationWindowMs: 5000,
  momentumWindowMs: 15000,
  minEventsForPattern: 3,
};

/**
 * Attention Bus 类
 */
export class AttentionBus {
  private eventSubject: Subject<LiveEvent>;
  private stateSubject: BehaviorSubject<AttentionState>;
  private eventBuffer: LiveEvent[] = [];
  private config: AttentionBusConfig;
  private lastState: AttentionState;

  constructor(config: Partial<AttentionBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventSubject = new Subject<LiveEvent>();
    this.stateSubject = new BehaviorSubject<AttentionState>(this.createInitialState());

    this.lastState = this.createInitialState();
    this.setupEventProcessing();
  }

  /**
   * 推送事件
   */
  push(event: LiveEvent): void {
    this.eventBuffer.push(event);
    this.eventSubject.next(event);
  }

  /**
   * 批量推送事件
   */
  pushBatch(events: LiveEvent[]): void {
    events.forEach(event => this.push(event));
  }

  /**
   * 获取当前注意力状态
   */
  getState(): AttentionState {
    return this.lastState;
  }

  /**
   * 订阅注意力状态变化
   */
  subscribe(callback: (state: AttentionState) => void): void {
    this.stateSubject.subscribe(callback);
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<LiveEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * 设置事件处理逻辑
   */
  private setupEventProcessing(): void {
    this.eventSubject.subscribe(event => {
      const newState = this.computeAttentionState(event);
      this.lastState = newState;
      this.stateSubject.next(newState);
    });
  }

  /**
   * 计算注意力状态
   */
  private computeAttentionState(currentEvent: LiveEvent): AttentionState {
    const now = currentEvent.timestamp;
    const windowStart = now - this.config.aggregationWindowMs;

    // 获取时间窗口内的事件
    const recentEvents = this.eventBuffer.filter(e => e.timestamp >= windowStart);

    // 计算注意力密度
    const density = this.computeDensity(recentEvents, now);

    // 计算注意力动量
    const momentum = this.computeMomentum(now);

    // 识别热点话题
    const topic = this.identifyTopic(recentEvents);

    // 识别模式
    const pattern = this.identifyPattern(recentEvents, density, momentum);

    return {
      density,
      momentum,
      topic,
      pattern,
      timestamp: now,
    };
  }

  /**
   * 计算注意力密度
   * 基于事件数量、类型权重和时间衰减
   */
  private computeDensity(events: LiveEvent[], now: number): number {
    if (events.length === 0) return 0;

    let totalWeight = 0;

    events.forEach(event => {
      // 时间衰减因子 (越近的事件权重越高)
      const age = now - event.timestamp;
      const timeDecay = Math.exp(-age / 10000); // 10秒半衰期

      // 事件类型权重
      const typeWeight = this.getEventTypeWeight(event.eventType);

      totalWeight += typeWeight * timeDecay;
    });

    // 归一化到 0-1
    const maxPossibleWeight = events.length * 5; // 礼物权重最高为 5
    return Math.min(totalWeight / maxPossibleWeight, 1);
  }

  /**
   * 获取事件类型权重
   */
  private getEventTypeWeight(eventType: string): number {
    const weights: Record<string, number> = {
      gift: 5, // 礼物权重最高
      click_cart: 4, // 点击购物车
      comment: 3, // 评论
      like: 2, // 点赞
      user_enter: 1, // 用户进入
      replay: 1.5, // 回放
      exit: -1, // 退出为负权重
    };

    return weights[eventType] || 1;
  }

  /**
   * 计算注意力动量
   * 表示注意力变化趋势
   */
  private computeMomentum(now: number): number {
    const momentumWindowStart = now - this.config.momentumWindowMs;
    const aggregationWindowStart = now - this.config.aggregationWindowMs;

    const momentumWindowEvents = this.eventBuffer.filter(
      e => e.timestamp >= momentumWindowStart
    );
    const aggregationWindowEvents = this.eventBuffer.filter(
      e => e.timestamp >= aggregationWindowStart
    );

    if (momentumWindowEvents.length < 2) return 0;

    // 计算两个窗口的密度差
    const currentDensity = this.computeDensity(aggregationWindowEvents, now);
    const previousDensity = this.computeDensity(
      momentumWindowEvents.filter(e => e.timestamp < aggregationWindowStart),
      aggregationWindowStart
    );

    // 动量 = 当前密度 - 前一密度
    return currentDensity - previousDensity;
  }

  /**
   * 识别热点话题
   * 基于评论内容的关键词提取
   */
  private identifyTopic(events: LiveEvent[]): string | null {
    const comments = events.filter(
      e => e.eventType === 'comment'
    ) as CommentEvent[];

    if (comments.length < this.config.minEventsForPattern) {
      return null;
    }

    // 简单的关键词统计
    const keywordCounts: Record<string, number> = {};

    comments.forEach(comment => {
      const keywords = this.extractKeywords(comment.content);
      keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });

    // 找出最高频关键词
    let maxCount = 0;
    let topKeyword: string | null = null;

    Object.entries(keywordCounts).forEach(([keyword, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topKeyword = keyword;
      }
    });

    return maxCount >= this.config.minEventsForPattern ? topKeyword : null;
  }

  /**
   * 提取关键词
   * 简化版：基于预定义的关键词列表
   */
  private extractKeywords(text: string): string[] {
    const keywordPatterns = [
      { pattern: /挑食|适口性|不爱吃/, keyword: 'picky_eating' },
      { pattern: /价格|多少钱|便宜|优惠|活动/, keyword: 'price' },
      { pattern: /物流|发货|快递/, keyword: 'logistics' },
      { pattern: /质量|成分|营养/, keyword: 'quality' },
      { pattern: /退货|退款|售后/, keyword: 'after_sales' },
      { pattern: /买|下单|购/, keyword: 'purchase' },
    ];

    const keywords: string[] = [];

    keywordPatterns.forEach(({ pattern, keyword }) => {
      if (pattern.test(text)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * 识别注意力模式
   */
  private identifyPattern(
    events: LiveEvent[],
    density: number,
    momentum: number
  ): AttentionPattern {
    // 流失风险：低密度 + 负动量
    if (density < 0.3 && momentum < -0.1) {
      return 'drop_risk';
    }

    // 高互动：高密度 + 正动量
    if (density > 0.7 && momentum > 0.1) {
      return 'engagement_high';
    }

    // 购买犹豫：有购物车点击但密度下降
    const hasCartClick = events.some(e => e.eventType === 'click_cart');
    if (hasCartClick && momentum < 0) {
      return 'purchase_hesitation';
    }

    // 好奇心高峰：话题频繁变化
    const topic = this.identifyTopic(events);
    if (topic && density > 0.5) {
      return 'curiosity_peak';
    }

    // 无聊：低密度 + 无话题
    if (density < 0.4 && !topic) {
      return 'boredom';
    }

    // 困惑：频繁提问但无购买行为
    const comments = events.filter(e => e.eventType === 'comment') as CommentEvent[];
    const questionCount = comments.filter(c => c.content.includes('?') || c.content.includes('？')).length;
    if (questionCount >= 3 && !events.some(e => e.eventType === 'click_cart')) {
      return 'confusion';
    }

    // 默认
    return 'engagement_high';
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): AttentionState {
    return {
      density: 0,
      momentum: 0,
      topic: null,
      pattern: 'boredom',
      timestamp: Date.now(),
    };
  }
}

/**
 * 导出便捷函数
 */
export function createAttentionBus(
  config?: Partial<AttentionBusConfig>
): AttentionBus {
  return new AttentionBus(config);
}
