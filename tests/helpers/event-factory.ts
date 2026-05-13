/**
 * 测试事件工厂
 */

import { v4 as uuidv4 } from 'uuid';
import { LiveEvent, CommentEvent, LikeEvent, GiftEvent, UserEnterEvent } from '../../src/types';

let eventIdCounter = 0;

export function createCommentEvent(content: string, userName: string = '测试用户'): CommentEvent {
  return {
    eventId: `event-${++eventIdCounter}`,
    eventType: 'comment',
    timestamp: Date.now(),
    sessionId: 'test-session',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    userName,
    content,
  };
}

export function createLikeEvent(count: number = 1): LikeEvent {
  return {
    eventId: `event-${++eventIdCounter}`,
    eventType: 'like',
    timestamp: Date.now(),
    sessionId: 'test-session',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    count,
  };
}

export function createGiftEvent(giftName: string = '礼物', value: number = 10): GiftEvent {
  return {
    eventId: `event-${++eventIdCounter}`,
    eventType: 'gift',
    timestamp: Date.now(),
    sessionId: 'test-session',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    userName: '测试用户',
    giftId: `gift-${Math.floor(Math.random() * 100)}`,
    giftName,
    value,
  };
}

export function createUserEnterEvent(userName: string = '新用户'): UserEnterEvent {
  return {
    eventId: `event-${++eventIdCounter}`,
    eventType: 'user_enter',
    timestamp: Date.now(),
    sessionId: 'test-session',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    userName,
  };
}

export function createRandomEvent(): LiveEvent {
  const types = ['comment', 'like', 'gift', 'user_enter'];
  const type = types[Math.floor(Math.random() * types.length)] as any;

  switch (type) {
    case 'comment':
      return createCommentEvent(`测试评论 ${Math.floor(Math.random() * 1000)}`);
    case 'like':
      return createLikeEvent(Math.floor(Math.random() * 10) + 1);
    case 'gift':
      return createGiftEvent('小礼物', Math.floor(Math.random() * 100));
    case 'user_enter':
      return createUserEnterEvent();
    default:
      return createCommentEvent('默认评论');
  }
}

export function createEventBatch(count: number): LiveEvent[] {
  const events: LiveEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push(createRandomEvent());
  }
  return events;
}
