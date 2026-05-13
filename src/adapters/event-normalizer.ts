/**
 * Event Normalizer
 * 核心职责：将不同平台的原始事件转换为统一的 LiveEvent 格式
 */

import {
  LiveEvent,
  CommentEvent,
  LikeEvent,
  GiftEvent,
  UserEnterEvent,
  ExitEvent,
  ClickCartEvent,
} from '../types';
import { DouyinRawEvent } from '../adapters/douyin-adapter';

/**
 * 事件规范化器类
 */
export class EventNormalizer {
  /**
   * 规范化抖音原始事件
   */
  normalizeDouyinEvent(rawEvent: DouyinRawEvent, roomId: string): LiveEvent | null {
    switch (rawEvent.type) {
      case 'comment':
        return this.normalizeComment(rawEvent, roomId);

      case 'like':
        return this.normalizeLike(rawEvent, roomId);

      case 'gift':
        return this.normalizeGift(rawEvent, roomId);

      case 'enter':
        return this.normalizeEnter(rawEvent, roomId);

      case 'exit':
        return this.normalizeExit(rawEvent, roomId);

      case 'click_cart':
        return this.normalizeClickCart(rawEvent, roomId);

      default:
        console.warn(`[EventNormalizer] 未知事件类型: ${rawEvent.type}`);
        return null;
    }
  }

  /**
   * 批量规范化事件
   */
  normalizeDouyinEvents(rawEvents: DouyinRawEvent[], roomId: string): LiveEvent[] {
    const events: LiveEvent[] = [];

    for (const rawEvent of rawEvents) {
      const event = this.normalizeDouyinEvent(rawEvent, roomId);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 规范化评论事件
   */
  private normalizeComment(rawEvent: DouyinRawEvent, roomId: string): CommentEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'comment',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      userName: data.user_name || data.userName || data.nickname || '匿名用户',
      content: data.content || data.text || data.msg || '',
    };
  }

  /**
   * 规范化点赞事件
   */
  private normalizeLike(rawEvent: DouyinRawEvent, roomId: string): LikeEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'like',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      count: data.count || data.like_count || 1,
    };
  }

  /**
   * 规范化礼物事件
   */
  private normalizeGift(rawEvent: DouyinRawEvent, roomId: string): GiftEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'gift',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      userName: data.user_name || data.userName || data.nickname || '匿名用户',
      giftId: data.gift_id || data.giftId || 'unknown',
      giftName: data.gift_name || data.giftName || '礼物',
      value: data.value || data.gift_value || data.diamond_count || 0,
    };
  }

  /**
   * 规范化用户进入事件
   */
  private normalizeEnter(rawEvent: DouyinRawEvent, roomId: string): UserEnterEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'user_enter',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      userName: data.user_name || data.userName || data.nickname || '匿名用户',
    };
  }

  /**
   * 规范化用户退出事件
   */
  private normalizeExit(rawEvent: DouyinRawEvent, roomId: string): ExitEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'exit',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      watchDuration: data.watch_duration || data.watchDuration || 0,
    };
  }

  /**
   * 规范化点击购物车事件
   */
  private normalizeClickCart(rawEvent: DouyinRawEvent, roomId: string): ClickCartEvent {
    const data = rawEvent.data || {};

    return {
      eventId: this.generateId(),
      eventType: 'click_cart',
      sessionId: roomId,
      timestamp: rawEvent.timestamp || Date.now(),
      userId: data.user_id || data.userId || 'unknown',
      productId: data.product_id || data.productId || 'unknown',
    };
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 导出便捷函数
 */
export function createEventNormalizer(): EventNormalizer {
  return new EventNormalizer();
}
