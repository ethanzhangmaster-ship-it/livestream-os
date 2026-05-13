/**
 * 自动回复引擎
 * 
 * 根据观众评论、意图、注意力状态，自动生成个性化回复
 */

import { CommentClassifier, ClassificationResult, CommentType } from './comment-classifier';
import { SessionContext, DEFAULT_SESSION_CONTEXT } from './script-generator';

/**
 * 用户信息
 */
export interface User {
  openId: string;
  nickname: string;
  avatarUrl?: string;
}

/**
 * 评论信息
 */
export interface Comment {
  msgId: string;
  content: string;
  user: User;
  timestamp: number;
}

/**
 * 回复信息
 */
export interface Reply {
  commentId: string;
  reply: string;
  confidence: number;
  type: CommentType;
  timestamp: number;
}

/**
 * 回复策略
 */
export interface ReplyStrategy {
  type: CommentType;
  maxRepliesPerMinute: number;  // 每分钟最大回复数
  minInterval: number;           // 最小间隔（毫秒）
  priority: number;              // 优先级
}

/**
 * 默认回复策略
 */
export const DEFAULT_REPLY_STRATEGIES: ReplyStrategy[] = [
  { type: 'purchase_signal', maxRepliesPerMinute: 30, minInterval: 1000, priority: 10 },
  { type: 'complaint', maxRepliesPerMinute: 20, minInterval: 2000, priority: 10 },
  { type: 'objection', maxRepliesPerMinute: 20, minInterval: 2000, priority: 9 },
  { type: 'price_inquiry', maxRepliesPerMinute: 15, minInterval: 3000, priority: 9 },
  { type: 'product_inquiry', maxRepliesPerMinute: 15, minInterval: 3000, priority: 8 },
  { type: 'usage_inquiry', maxRepliesPerMinute: 15, minInterval: 3000, priority: 8 },
  { type: 'praise', maxRepliesPerMinute: 10, minInterval: 5000, priority: 7 },
  { type: 'interaction', maxRepliesPerMinute: 10, minInterval: 5000, priority: 6 },
];

/**
 * 自动回复引擎
 */
export class AutoReplyEngine {
  private classifier: CommentClassifier;
  private context: SessionContext;
  private strategies: ReplyStrategy[];
  private replyHistory: Reply[] = [];
  private replyCountByType: Map<CommentType, number[]> = new Map();

  constructor(
    context: SessionContext = DEFAULT_SESSION_CONTEXT,
    strategies: ReplyStrategy[] = DEFAULT_REPLY_STRATEGIES
  ) {
    this.classifier = new CommentClassifier();
    this.context = context;
    this.strategies = strategies;
    this.initializeCounters();
  }

  /**
   * 初始化计数器
   */
  private initializeCounters(): void {
    for (const strategy of this.strategies) {
      this.replyCountByType.set(strategy.type, []);
    }
  }

  /**
   * 更新上下文
   */
  updateContext(updates: Partial<SessionContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 生成回复
   */
  generateReply(comment: Comment): Reply | null {
    // 1. 分类评论
    const classification = this.classifier.classify(comment.content);
    
    if (!classification) {
      // 使用通用回复
      return this.generateGenericReply(comment);
    }

    // 2. 检查回复策略
    const strategy = this.getStrategy(classification.type);
    
    if (!strategy) {
      return null;
    }

    // 3. 检查频率限制
    if (!this.canReply(classification.type, strategy)) {
      console.log(`[AutoReply] 频率限制，跳过回复: ${classification.type}`);
      return null;
    }

    // 4. 生成回复内容
    const replyContent = this.generateReplyContent(classification, comment);

    // 5. 创建回复对象
    const reply: Reply = {
      commentId: comment.msgId,
      reply: replyContent,
      confidence: classification.confidence,
      type: classification.type,
      timestamp: Date.now(),
    };

    // 6. 记录历史
    this.recordReply(reply);

    return reply;
  }

  /**
   * 批量生成回复
   */
  batchReply(comments: Comment[]): Reply[] {
    const replies: Reply[] = [];

    // 按优先级排序评论
    const sortedComments = this.sortCommentsByPriority(comments);

    for (const comment of sortedComments) {
      const reply = this.generateReply(comment);
      
      if (reply) {
        replies.push(reply);
      }
    }

    return replies;
  }

  /**
   * 生成回复内容
   */
  private generateReplyContent(
    classification: ClassificationResult,
    comment: Comment
  ): string {
    const { product, promotion } = this.context;
    
    // 填充模板变量
    let reply = classification.category.responseTemplate;
    
    const variables: Record<string, string> = {
      product_name: product.name,
      price: product.price.toString(),
      ingredient: product.ingredient,
      benefit: product.benefits[0] || '',
      value_proposition: product.valueProposition,
      discount: promotion.discount.toString(),
      buy_count: promotion.buyCount.toString(),
      get_count: promotion.getCount.toString(),
      gift: promotion.gift,
      user_name: comment.user.nickname,
    };

    for (const [key, value] of Object.entries(variables)) {
      reply = reply.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return reply;
  }

  /**
   * 生成通用回复
   */
  private generateGenericReply(comment: Comment): Reply | null {
    const genericReplies = [
      '感谢您的关注！有什么可以帮您的吗？',
      '收到！稍后为您解答~',
      '好的，马上为您处理~',
    ];

    const reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];

    return {
      commentId: comment.msgId,
      reply: `${comment.user.nickname}，${reply}`,
      confidence: 0.5,
      type: 'interaction',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取回复策略
   */
  private getStrategy(type: CommentType): ReplyStrategy | undefined {
    return this.strategies.find(s => s.type === type);
  }

  /**
   * 检查是否可以回复
   */
  private canReply(type: CommentType, strategy: ReplyStrategy): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 获取该类型的回复时间戳
    const timestamps = this.replyCountByType.get(type) || [];
    
    // 过滤最近一分钟的回复
    const recentReplies = timestamps.filter(t => t > oneMinuteAgo);
    
    // 检查频率限制
    if (recentReplies.length >= strategy.maxRepliesPerMinute) {
      return false;
    }

    // 检查最小间隔
    if (recentReplies.length > 0) {
      const lastReplyTime = Math.max(...recentReplies);
      if (now - lastReplyTime < strategy.minInterval) {
        return false;
      }
    }

    return true;
  }

  /**
   * 记录回复
   */
  private recordReply(reply: Reply): void {
    this.replyHistory.push(reply);
    
    // 更新计数器
    const timestamps = this.replyCountByType.get(reply.type) || [];
    timestamps.push(reply.timestamp);
    this.replyCountByType.set(reply.type, timestamps);
  }

  /**
   * 按优先级排序评论
   */
  private sortCommentsByPriority(comments: Comment[]): Comment[] {
    return comments.sort((a, b) => {
      const classificationA = this.classifier.classify(a.content);
      const classificationB = this.classifier.classify(b.content);

      const priorityA = classificationA?.category.priority || 0;
      const priorityB = classificationB?.category.priority || 0;

      return priorityB - priorityA;
    });
  }

  /**
   * 获取回复历史
   */
  getHistory(): Reply[] {
    return this.replyHistory;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalReplies: number;
    repliesByType: Record<string, number>;
    avgConfidence: number;
  } {
    const repliesByType: Record<string, number> = {};
    
    for (const reply of this.replyHistory) {
      repliesByType[reply.type] = (repliesByType[reply.type] || 0) + 1;
    }

    const avgConfidence = this.replyHistory.length > 0
      ? this.replyHistory.reduce((sum, r) => sum + r.confidence, 0) / this.replyHistory.length
      : 0;

    return {
      totalReplies: this.replyHistory.length,
      repliesByType,
      avgConfidence,
    };
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.replyHistory = [];
    this.initializeCounters();
  }
}

/**
 * 创建默认自动回复引擎实例
 */
export function createAutoReplyEngine(
  context?: SessionContext
): AutoReplyEngine {
  return new AutoReplyEngine(context);
}
