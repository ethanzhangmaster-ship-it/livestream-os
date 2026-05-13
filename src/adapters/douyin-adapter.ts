/**
 * Douyin Adapter
 * 核心职责：连接抖音直播间，接收实时事件
 * 当前版本：模拟数据，验证架构
 * 未来版本：接入真实 WebSocket API
 */

import { Subject, Observable } from 'rxjs';
import {
  LiveEvent,
  CommentEvent,
  LikeEvent,
  GiftEvent,
  UserEnterEvent,
  ExitEvent,
  ClickCartEvent,
} from '../types';

export interface DouyinAdapterConfig {
  roomId: string;
  enableFakeData: boolean; // 是否使用模拟数据
  fakeDataInterval?: number; // 模拟数据生成间隔（ms）
}

const DEFAULT_CONFIG: DouyinAdapterConfig = {
  roomId: '',
  enableFakeData: true,
  fakeDataInterval: 3000,
};

/**
 * 抖音原始事件格式
 * 这是抖音 WebSocket 返回的原始数据格式
 */
export interface DouyinRawEvent {
  type: 'comment' | 'like' | 'gift' | 'enter' | 'exit' | 'click_cart';
  timestamp: number;
  data: any;
}

/**
 * Douyin Adapter 类
 */
export class DouyinAdapter {
  private config: DouyinAdapterConfig;
  private eventSubject: Subject<LiveEvent>;
  private connected: boolean = false;
  private fakeDataTimer?: NodeJS.Timeout;

  constructor(config: Partial<DouyinAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventSubject = new Subject<LiveEvent>();
  }

  /**
   * 连接到抖音直播间
   */
  async connect(): Promise<{ success: boolean; message?: string }> {
    if (this.config.enableFakeData) {
      return this.connectFake();
    } else {
      return this.connectReal();
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.fakeDataTimer) {
      clearInterval(this.fakeDataTimer);
    }

    this.connected = false;
    console.log('[DouyinAdapter] 已断开连接');
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<LiveEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 连接到模拟数据源
   */
  private async connectFake(): Promise<{ success: boolean; message?: string }> {
    console.log(`[DouyinAdapter] 使用模拟数据模式`);

    this.connected = true;

    // 启动模拟数据生成器
    this.startFakeDataGenerator();

    return { success: true, message: '已连接到模拟数据源' };
  }

  /**
   * 连接到真实抖音直播间
   * TODO: 实现真实的 WebSocket 连接
   */
  private async connectReal(): Promise<{ success: boolean; message?: string }> {
    if (!this.config.roomId) {
      return { success: false, message: '未提供直播间 ID' };
    }

    console.log(`[DouyinAdapter] 连接到直播间 ${this.config.roomId}`);

    // TODO: 实现真实的 WebSocket 连接
    // 1. 获取签名参数（X-Bogus, ac_signature）
    // 2. 建立 WebSocket 连接
    // 3. 发送认证消息
    // 4. 启动心跳机制
    // 5. 解析 Protobuf 数据

    return {
      success: false,
      message: '真实 API 连接尚未实现，请使用 enableFakeData: true',
    };
  }

  /**
   * 启动模拟数据生成器
   */
  private startFakeDataGenerator(): void {
    if (!this.config.fakeDataInterval) return;

    const scenarios = [
      this.generateCommentEvent.bind(this),
      this.generateLikeEvent.bind(this),
      this.generateUserEnterEvent.bind(this),
      this.generateGiftEvent.bind(this),
    ];

    let index = 0;

    this.fakeDataTimer = setInterval(() => {
      const generator = scenarios[index % scenarios.length];
      const event = generator();
      this.eventSubject.next(event);
      index++;
    }, this.config.fakeDataInterval);

    console.log(`[DouyinAdapter] 模拟数据生成器已启动 (间隔: ${this.config.fakeDataInterval}ms)`);
  }

  /**
   * 生成模拟评论事件
   */
  private generateCommentEvent(): CommentEvent {
    const comments = [
      '这个猫粮怎么样',
      '挑食能吃吗',
      '多少钱',
      '有优惠吗',
      '已下单',
      '主播好可爱',
      '适口性怎么样',
      '买回去不吃能退吗',
    ];

    const users = ['小明', '小红', '小刚', '小美', '用户123'];

    return {
      eventId: this.generateId(),
      eventType: 'comment',
      sessionId: this.config.roomId || 'fake_session',
      timestamp: Date.now(),
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      userName: users[Math.floor(Math.random() * users.length)],
      content: comments[Math.floor(Math.random() * comments.length)],
    };
  }

  /**
   * 生成模拟点赞事件
   */
  private generateLikeEvent(): LikeEvent {
    return {
      eventId: this.generateId(),
      eventType: 'like',
      sessionId: this.config.roomId || 'fake_session',
      timestamp: Date.now(),
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      count: Math.floor(Math.random() * 5) + 1,
    };
  }

  /**
   * 生成模拟用户进入事件
   */
  private generateUserEnterEvent(): UserEnterEvent {
    const users = ['张三', '李四', '王五', '赵六', '新用户'];

    return {
      eventId: this.generateId(),
      eventType: 'user_enter',
      sessionId: this.config.roomId || 'fake_session',
      timestamp: Date.now(),
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      userName: users[Math.floor(Math.random() * users.length)],
    };
  }

  /**
   * 生成模拟礼物事件
   */
  private generateGiftEvent(): GiftEvent {
    const gifts = [
      { id: 'gift_001', name: '小心心', value: 1 },
      { id: 'gift_002', name: '棒棒糖', value: 5 },
      { id: 'gift_003', name: '火箭', value: 100 },
    ];

    const gift = gifts[Math.floor(Math.random() * gifts.length)];

    return {
      eventId: this.generateId(),
      eventType: 'gift',
      sessionId: this.config.roomId || 'fake_session',
      timestamp: Date.now(),
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      userName: `用户${Math.floor(Math.random() * 100)}`,
      giftId: gift.id,
      giftName: gift.name,
      value: gift.value,
    };
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // 真实 API 相关方法（TODO）
  // ============================================

  /**
   * 获取签名参数
   * TODO: 实现 X-Bogus 和 ac_signature 生成
   */
  private async getSignature(url: string): Promise<string> {
    // 需要调用 JavaScript 签名生成器
    throw new Error('Not implemented');
  }

  /**
   * 建立 WebSocket 连接
   * TODO: 实现真实的 WebSocket 连接
   */
  private async establishWebSocket(): Promise<void> {
    // 需要：
    // 1. 获取 ttwid
    // 2. 生成签名
    // 3. 建立 WebSocket 连接
    // 4. 处理 Protobuf 数据
    throw new Error('Not implemented');
  }

  /**
   * 解析 Protobuf 数据
   * TODO: 实现 Protobuf 解析
   */
  private parseProtobuf(data: Buffer): DouyinRawEvent[] {
    // 需要根据抖音的 Protobuf 定义解析数据
    throw new Error('Not implemented');
  }
}

/**
 * 导出便捷函数
 */
export function createDouyinAdapter(config?: Partial<DouyinAdapterConfig>): DouyinAdapter {
  return new DouyinAdapter(config);
}
