/**
 * Fake Event Generator
 * 用于在没有真实抖音数据时验证系统闭环
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  LiveEvent,
  CommentEvent,
  LikeEvent,
  GiftEvent,
  UserEnterEvent,
  ExitEvent,
  ClickCartEvent,
} from '../types';

export type Scenario =
  | 'purchase_hesitation' // 购买犹豫场景
  | 'high_engagement' // 高互动场景
  | 'price_sensitivity' // 价格敏感场景
  | 'drop_risk' // 流失风险场景
  | 'mixed'; // 混合场景

export interface ScenarioConfig {
  name: string;
  description: string;
  events: () => LiveEvent[];
  duration: number; // ms
}

/**
 * 场景模板配置
 */
const SCENARIO_TEMPLATES: Record<Scenario, ScenarioConfig> = {
  purchase_hesitation: {
    name: '购买犹豫场景',
    description: '用户连续询问产品相关问题，表现出购买犹豫',
    duration: 30000,
    events: () => generatePurchaseHesitationEvents(),
  },
  high_engagement: {
    name: '高互动场景',
    description: '用户活跃互动，点赞评论频繁',
    duration: 20000,
    events: () => generateHighEngagementEvents(),
  },
  price_sensitivity: {
    name: '价格敏感场景',
    description: '用户关注价格，询问优惠',
    duration: 25000,
    events: () => generatePriceSensitivityEvents(),
  },
  drop_risk: {
    name: '流失风险场景',
    description: '用户停留时间短，互动少',
    duration: 15000,
    events: () => generateDropRiskEvents(),
  },
  mixed: {
    name: '混合场景',
    description: '多种意图混合',
    duration: 40000,
    events: () => generateMixedEvents(),
  },
};

/**
 * 生成购买犹豫场景事件
 */
function generatePurchaseHesitationEvents(): LiveEvent[] {
  const sessionId = uuidv4();
  const baseTime = Date.now();
  const events: LiveEvent[] = [];

  // 用户进入
  events.push(createUserEnter(sessionId, baseTime, 'user_001', '小明'));

  // 连续询问产品问题
  const questions = [
    '这个猫粮挑食能吃吗？',
    '我家猫很挑食怎么办',
    '适口性怎么样',
    '买回去不吃能退吗',
    '有试吃装吗',
  ];

  questions.forEach((content, index) => {
    events.push(
      createComment(sessionId, baseTime + 2000 + index * 3000, 'user_001', '小明', content)
    );
  });

  // 点赞
  events.push(createLike(sessionId, baseTime + 10000, 'user_001', 3));

  // 点击购物车
  events.push(createClickCart(sessionId, baseTime + 25000, 'user_001', 'cat_food_001'));

  return events;
}

/**
 * 生成高互动场景事件
 */
function generateHighEngagementEvents(): LiveEvent[] {
  const sessionId = uuidv4();
  const baseTime = Date.now();
  const events: LiveEvent[] = [];

  // 多个用户进入
  for (let i = 1; i <= 5; i++) {
    events.push(
      createUserEnter(sessionId, baseTime + i * 500, `user_${i.toString().padStart(3, '0')}`, `用户${i}`)
    );
  }

  // 频繁评论
  const comments = [
    '主播好可爱',
    '这个看起来不错',
    '多少钱啊',
    '已下单',
    '猫咪好萌',
    '支持主播',
    '买一送一吗',
  ];

  comments.forEach((content, index) => {
    const userId = `user_${((index % 5) + 1).toString().padStart(3, '0')}`;
    events.push(
      createComment(sessionId, baseTime + 1000 + index * 2000, userId, `用户${(index % 5) + 1}`, content)
    );
  });

  // 大量点赞
  for (let i = 0; i < 10; i++) {
    const userId = `user_${((i % 5) + 1).toString().padStart(3, '0')}`;
    events.push(createLike(sessionId, baseTime + 1500 + i * 1500, userId, 1));
  }

  // 送礼物
  events.push(createGift(sessionId, baseTime + 12000, 'user_002', '用户2', 'gift_001', '小心心', 10));

  return events;
}

/**
 * 生成价格敏感场景事件
 */
function generatePriceSensitivityEvents(): LiveEvent[] {
  const sessionId = uuidv4();
  const baseTime = Date.now();
  const events: LiveEvent[] = [];

  events.push(createUserEnter(sessionId, baseTime, 'user_001', '价格敏感用户'));

  const questions = [
    '这个多少钱',
    '有优惠吗',
    '能便宜点吗',
    '比别家贵啊',
    '有什么活动',
    '包邮吗',
  ];

  questions.forEach((content, index) => {
    events.push(
      createComment(sessionId, baseTime + 2000 + index * 3000, 'user_001', '价格敏感用户', content)
    );
  });

  events.push(createLike(sessionId, baseTime + 15000, 'user_001', 2));

  return events;
}

/**
 * 生成流失风险场景事件
 */
function generateDropRiskEvents(): LiveEvent[] {
  const sessionId = uuidv4();
  const baseTime = Date.now();
  const events: LiveEvent[] = [];

  // 用户快速进入又退出
  for (let i = 1; i <= 3; i++) {
    const enterTime = baseTime + i * 3000;
    events.push(createUserEnter(sessionId, enterTime, `user_${i}`, `用户${i}`));

    // 很快退出
    events.push(createExit(sessionId, enterTime + 2000, `user_${i}`, 2000));
  }

  // 少量评论
  events.push(createComment(sessionId, baseTime + 5000, 'user_001', '用户1', '嗯'));

  return events;
}

/**
 * 生成混合场景事件
 */
function generateMixedEvents(): LiveEvent[] {
  const sessionId = uuidv4();
  const baseTime = Date.now();
  const events: LiveEvent[] = [];

  // 用户进入
  for (let i = 1; i <= 4; i++) {
    events.push(
      createUserEnter(sessionId, baseTime + i * 1000, `user_${i}`, `用户${i}`)
    );
  }

  // 混合评论
  const comments = [
    { userId: 'user_1', content: '这个猫粮怎么样' },
    { userId: 'user_2', content: '多少钱' },
    { userId: 'user_3', content: '已下单' },
    { userId: 'user_1', content: '挑食能吃吗' },
    { userId: 'user_4', content: '主播好棒' },
    { userId: 'user_2', content: '有优惠吗' },
    { userId: 'user_3', content: '物流快吗' },
  ];

  comments.forEach((item, index) => {
    events.push(
      createComment(sessionId, baseTime + 5000 + index * 3000, item.userId, `用户${item.userId.split('_')[1]}`, item.content)
    );
  });

  // 点赞
  for (let i = 0; i < 5; i++) {
    events.push(createLike(sessionId, baseTime + 6000 + i * 4000, `user_${(i % 4) + 1}`, 1));
  }

  // 送礼物
  events.push(createGift(sessionId, baseTime + 20000, 'user_3', '用户3', 'gift_002', '火箭', 100));

  // 点击购物车
  events.push(createClickCart(sessionId, baseTime + 25000, 'user_1', 'cat_food_001'));
  events.push(createClickCart(sessionId, baseTime + 30000, 'user_2', 'cat_food_002'));

  return events;
}

// ============================================
// Helper Functions
// ============================================

function createUserEnter(
  sessionId: string,
  timestamp: number,
  userId: string,
  userName: string
): UserEnterEvent {
  return {
    eventId: uuidv4(),
    eventType: 'user_enter',
    sessionId,
    timestamp,
    userId,
    userName,
  };
}

function createComment(
  sessionId: string,
  timestamp: number,
  userId: string,
  userName: string,
  content: string
): CommentEvent {
  return {
    eventId: uuidv4(),
    eventType: 'comment',
    sessionId,
    timestamp,
    userId,
    userName,
    content,
  };
}

function createLike(
  sessionId: string,
  timestamp: number,
  userId: string,
  count: number
): LikeEvent {
  return {
    eventId: uuidv4(),
    eventType: 'like',
    sessionId,
    timestamp,
    userId,
    count,
  };
}

function createGift(
  sessionId: string,
  timestamp: number,
  userId: string,
  userName: string,
  giftId: string,
  giftName: string,
  value: number
): GiftEvent {
  return {
    eventId: uuidv4(),
    eventType: 'gift',
    sessionId,
    timestamp,
    userId,
    userName,
    giftId,
    giftName,
    value,
  };
}

function createExit(
  sessionId: string,
  timestamp: number,
  userId: string,
  watchDuration: number
): ExitEvent {
  return {
    eventId: uuidv4(),
    eventType: 'exit',
    sessionId,
    timestamp,
    userId,
    watchDuration,
  };
}

function createClickCart(
  sessionId: string,
  timestamp: number,
  userId: string,
  productId: string
): ClickCartEvent {
  return {
    eventId: uuidv4(),
    eventType: 'click_cart',
    sessionId,
    timestamp,
    userId,
    productId,
  };
}

/**
 * Fake Event Generator 类
 */
export class FakeEventGenerator extends EventEmitter {
  private sessionId: string;
  private scenario: Scenario;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(scenario: Scenario = 'mixed') {
    super();
    this.sessionId = uuidv4();
    this.scenario = scenario;
  }

  /**
   * 开始持续生成事件
   */
  startContinuous(options: {
    scenario?: Scenario;
    intervalMs?: number;
  } = {}): void {
    if (this.isRunning) {
      console.warn('[FakeEventGenerator] Already running');
      return;
    }

    if (options.scenario) {
      this.scenario = options.scenario;
    }

    const intervalMs = options.intervalMs || 2000;
    this.isRunning = true;

    console.log(`[FakeEventGenerator] Starting continuous generation (${intervalMs}ms interval)`);

    // 立即生成第一批事件
    this.emitBatch();

    // 定期生成事件
    this.intervalId = setInterval(() => {
      this.emitBatch();
    }, intervalMs);
  }

  /**
   * 停止生成事件
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    console.log('[FakeEventGenerator] Stopped');
  }

  /**
   * 发射一批事件
   */
  private emitBatch(): void {
    const events = this.generateEvents();
    
    events.forEach(event => {
      this.emit('event', event);
    });

    console.log(`[FakeEventGenerator] Emitted ${events.length} events`);
  }

  /**
   * 生成事件流
   */
  generateEvents(): LiveEvent[] {
    const config = SCENARIO_TEMPLATES[this.scenario];
    const events = config.events();

    // 按时间排序
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取场景配置
   */
  getScenarioConfig(): ScenarioConfig {
    return SCENARIO_TEMPLATES[this.scenario];
  }

  /**
   * 获取 Session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 切换场景
   */
  setScenario(scenario: Scenario): void {
    this.scenario = scenario;
    this.sessionId = uuidv4();
  }
}

/**
 * 导出便捷函数
 */
export function generateFakeEvents(scenario: Scenario = 'mixed'): LiveEvent[] {
  const generator = new FakeEventGenerator(scenario);
  return generator.generateEvents();
}
