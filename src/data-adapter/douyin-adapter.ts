/**
 * 抖音直播数据适配器
 * 
 * 接入抖音开放平台"直播小玩法"API
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide
 */

import { EventEmitter } from 'events';
import express, { Request, Response } from 'express';
import { LiveEvent, CommentEvent, LikeEvent, GiftEvent, UserEnterEvent } from '../types';

export interface DouyinAdapterConfig {
  appKey: string;
  appSecret: string;
  callbackPort: number;
  callbackPath: string;
}

export interface DouyinLiveData {
  msg_id: string;
  msg_type: string;
  data: any[];
}

export interface DouyinComment {
  msg_id: string;
  content: string;
  user: {
    open_id: string;
    nickname: string;
    avatar_url: string;
  };
  timestamp: number;
}

export interface DouyinLike {
  msg_id: string;
  user: {
    open_id: string;
    nickname: string;
    avatar_url: string;
  };
  count: number;
  timestamp: number;
}

export interface DouyinGift {
  msg_id: string;
  user: {
    open_id: string;
    nickname: string;
    avatar_url: string;
  };
  gift_id: string;
  gift_name: string;
  gift_count: number;
  diamond_count: number;
  timestamp: number;
}

export class DouyinAdapter extends EventEmitter {
  private config: DouyinAdapterConfig;
  private app: express.Application;
  private server: any;
  private isRunning: boolean = false;

  constructor(config: DouyinAdapterConfig) {
    super();
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // 直播数据回调 - GET 请求（健康检查）
    this.app.get(this.config.callbackPath, (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        message: 'DouyinAdapter is running',
        timestamp: Date.now() 
      });
    });

    // 直播数据回调 - POST 请求（实际数据）
    this.app.post(this.config.callbackPath, async (req: Request, res: Response) => {
      try {
        const msgType = req.headers['x-msg-type'] as string;
        const anchorOpenId = req.headers['x-anchor-openid'] as string;
        const body = req.body;

        console.log(`[DouyinAdapter] 收到直播数据: msgType=${msgType}, anchorOpenId=${anchorOpenId}`);

        // 处理不同类型的消息
        const events = this.parseLiveData(msgType, body);
        
        // 发送事件
        events.forEach(event => {
          this.emit('event', event);
        });

        res.json({ err_no: 0, err_msg: 'success' });
      } catch (error) {
        console.error('[DouyinAdapter] 处理直播数据失败:', error);
        res.json({ err_no: -1, err_msg: 'internal error' });
      }
    });

    // 开始游戏回调
    this.app.post('/start_game', async (req: Request, res: Response) => {
      try {
        const appId = req.headers['x-tt-appid'] as string;
        const roomId = req.headers['x-room-id'] as string;
        const anchorOpenId = req.headers['x-anchor-openid'] as string;
        const avatarUrl = req.headers['x-avatar-url'] as string;
        const nickName = req.headers['x-nick-name'] as string;

        console.log(`[DouyinAdapter] 开始游戏: appId=${appId}, roomId=${roomId}, anchorOpenId=${anchorOpenId}`);

        // 开启推送任务
        await this.startLiveDataTask(appId, roomId);

        res.json({ err_no: 0, err_msg: 'success', data: { message: '开始游戏成功' } });
      } catch (error) {
        console.error('[DouyinAdapter] 开始游戏失败:', error);
        res.json({ err_no: -1, err_msg: 'internal error' });
      }
    });

    // 结束游戏回调
    this.app.post('/finish_game', async (req: Request, res: Response) => {
      try {
        console.log('[DouyinAdapter] 结束游戏');
        res.json({ err_no: 0, err_msg: 'success', data: { message: '结束游戏成功' } });
      } catch (error) {
        console.error('[DouyinAdapter] 结束游戏失败:', error);
        res.json({ err_no: -1, err_msg: 'internal error' });
      }
    });
  }

  /**
   * 解析直播数据
   */
  private parseLiveData(msgType: string, data: any[]): LiveEvent[] {
    const events: LiveEvent[] = [];

    switch (msgType) {
      case 'live_comment':
        // 评论
        data.forEach(item => {
          const comment = item as DouyinComment;
          events.push({
            eventId: `comment_${comment.msg_id}`,
            eventType: 'comment',
            sessionId: 'default',
            userId: comment.user.open_id,
            userName: comment.user.nickname,
            content: comment.content,
            timestamp: comment.timestamp || Date.now(),
          } as CommentEvent);
        });
        break;

      case 'live_like':
        // 点赞
        data.forEach(item => {
          const like = item as DouyinLike;
          events.push({
            eventId: `like_${like.msg_id}`,
            eventType: 'like',
            sessionId: 'default',
            userId: like.user.open_id,
            userName: like.user.nickname,
            count: like.count || 1,
            timestamp: like.timestamp || Date.now(),
          } as LikeEvent);
        });
        break;

      case 'live_gift':
        // 礼物
        data.forEach(item => {
          const gift = item as DouyinGift;
          events.push({
            eventId: `gift_${gift.msg_id}`,
            eventType: 'gift',
            sessionId: 'default',
            userId: gift.user.open_id,
            userName: gift.user.nickname,
            giftId: gift.gift_id,
            giftName: gift.gift_name,
            value: gift.diamond_count,
            timestamp: gift.timestamp || Date.now(),
          } as GiftEvent);
        });
        break;

      case 'live_fansclub':
        // 粉丝团（暂不处理）
        console.log('[DouyinAdapter] 粉丝团事件，暂不处理');
        break;

      default:
        console.warn(`[DouyinAdapter] 未知消息类型: ${msgType}`);
    }

    return events;
  }

  /**
   * 开启直播数据推送任务
   */
  private async startLiveDataTask(appId: string, roomId: string): Promise<void> {
    const msgTypes = ['live_comment', 'live_like', 'live_gift', 'live_fansclub'];

    for (const msgType of msgTypes) {
      try {
        // 调用抖音开放平台 API 开启推送任务
        // 注意：这里需要使用抖音云内网专线，或者通过 access_token 调用
        const response = await fetch('https://webcast-bytedance-com.openapi.dyc.ivolces.com/api/live_data/task/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appid: appId,
            roomid: roomId,
            msg_type: msgType,
          }),
        });

        const result = await response.json() as { err_no?: number; err_msg?: string };
        if (result.err_no === 0) {
          console.log(`[DouyinAdapter] 开启 ${msgType} 推送成功`);
        } else {
          console.error(`[DouyinAdapter] 开启 ${msgType} 推送失败:`, result.err_msg);
        }
      } catch (error) {
        console.error(`[DouyinAdapter] 开启 ${msgType} 推送异常:`, error);
      }
    }
  }

  /**
   * 启动适配器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DouyinAdapter] 已经在运行中');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.callbackPort, () => {
        console.log(`[DouyinAdapter] 服务已启动，监听端口 ${this.config.callbackPort}`);
        console.log(`[DouyinAdapter] 回调地址: http://localhost:${this.config.callbackPort}${this.config.callbackPath}`);
        this.isRunning = true;
        resolve();
      });

      this.server.on('error', (error: any) => {
        console.error('[DouyinAdapter] 服务启动失败:', error);
        reject(error);
      });
    });
  }

  /**
   * 停止适配器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[DouyinAdapter] 服务已停止');
        this.isRunning = false;
        resolve();
      });
    });
  }

  /**
   * 获取状态
   */
  getStatus(): { isRunning: boolean; port: number; callbackPath: string } {
    return {
      isRunning: this.isRunning,
      port: this.config.callbackPort,
      callbackPath: this.config.callbackPath,
    };
  }
}
