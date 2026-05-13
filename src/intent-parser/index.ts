/**
 * Intent Parser
 * 核心职责：理解用户意图，分类评论
 * 当前版本：基于规则的意图识别
 * 未来版本：接入 LLM 进行深度理解
 */

import {
  CommentEvent,
  Intent,
  IntentType,
  AttentionState,
} from '../types';

export interface IntentParserConfig {
  minConfidence: number; // 最小置信度阈值
  contextWindowSize: number; // 上下文窗口大小
}

const DEFAULT_CONFIG: IntentParserConfig = {
  minConfidence: 0.6,
  contextWindowSize: 10,
};

/**
 * 意图规则定义
 */
interface IntentRule {
  type: IntentType;
  patterns: RegExp[];
  keywords: string[];
  confidence: number;
  subIntent?: string;
  recommendedScene?: string;
  conversionProbability?: 'low' | 'medium' | 'high';
}

const INTENT_RULES: IntentRule[] = [
  // 产品咨询
  {
    type: 'product_inquiry',
    patterns: [
      /这个怎么样/,
      /好用吗/,
      /效果/,
      /成分/,
      /营养/,
      /什么牌子/,
    ],
    keywords: ['怎么样', '好用', '效果', '成分', '营养', '牌子'],
    confidence: 0.8,
    recommendedScene: 'product_intro',
    conversionProbability: 'medium',
  },

  // 购买犹豫
  {
    type: 'purchase_hesitation',
    patterns: [
      /挑食/,
      /不爱吃/,
      /适口性/,
      /买回去不吃/,
      /能退吗/,
      /有试吃/,
    ],
    keywords: ['挑食', '不爱吃', '适口性', '不吃', '试吃'],
    confidence: 0.85,
    subIntent: 'picky_eating',
    recommendedScene: 'palatability_demo',
    conversionProbability: 'high',
  },

  // 价格敏感
  {
    type: 'price_sensitivity',
    patterns: [
      /多少钱/,
      /价格/,
      /便宜/,
      /优惠/,
      /活动/,
      /包邮/,
      /能便宜/,
    ],
    keywords: ['价格', '多少钱', '便宜', '优惠', '活动', '包邮'],
    confidence: 0.85,
    recommendedScene: 'price_promotion',
    conversionProbability: 'high',
  },

  // 对比竞品
  {
    type: 'comparison',
    patterns: [
      /和.*比/,
      /比.*好/,
      /区别/,
      /对比/,
      /哪个好/,
    ],
    keywords: ['比', '区别', '对比', '哪个好'],
    confidence: 0.75,
    recommendedScene: 'product_comparison',
    conversionProbability: 'medium',
  },

  // 异议
  {
    type: 'objection',
    patterns: [
      /太贵/,
      /不值/,
      /不好/,
      /差评/,
      /不想买/,
      /考虑/,
    ],
    keywords: ['太贵', '不值', '不好', '差评', '不想买'],
    confidence: 0.8,
    recommendedScene: 'objection_handling',
    conversionProbability: 'low',
  },

  // 购买信号
  {
    type: 'readiness_signal',
    patterns: [
      /下单/,
      /买了/,
      /怎么买/,
      /链接/,
      /已购/,
      /发货/,
    ],
    keywords: ['下单', '买', '链接', '发货'],
    confidence: 0.9,
    recommendedScene: 'checkout_guide',
    conversionProbability: 'high',
  },

  // 闲聊
  {
    type: 'general_chat',
    patterns: [
      /主播/,
      /可爱/,
      /萌/,
      /支持/,
      /加油/,
    ],
    keywords: ['主播', '可爱', '萌', '支持', '加油'],
    confidence: 0.7,
    conversionProbability: 'low',
  },
];

/**
 * Intent Parser 类
 */
export class IntentParser {
  private config: IntentParserConfig;
  private recentComments: string[] = [];

  constructor(config: Partial<IntentParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 解析评论意图
   */
  parse(
    comment: CommentEvent,
    attentionState: AttentionState,
    sessionDuration: number
  ): Intent {
    // 更新上下文
    this.updateContext(comment.content);

    // 匹配规则
    const matchedIntent = this.matchRules(comment.content);

    // 构建意图对象
    const intent: Intent = {
      type: matchedIntent.type,
      confidence: matchedIntent.confidence,
      subIntent: matchedIntent.subIntent,
      recommendedScene: matchedIntent.recommendedScene,
      conversionProbability: matchedIntent.conversionProbability,
      sourceText: comment.content,
      context: {
        recentComments: this.recentComments.slice(-this.config.contextWindowSize),
        attentionState,
        sessionDuration,
      },
    };

    return intent;
  }

  /**
   * 批量解析评论
   */
  parseBatch(
    comments: CommentEvent[],
    attentionState: AttentionState,
    sessionDuration: number
  ): Intent[] {
    return comments.map(comment =>
      this.parse(comment, attentionState, sessionDuration)
    );
  }

  /**
   * 更新上下文
   */
  private updateContext(content: string): void {
    this.recentComments.push(content);

    // 保持窗口大小
    if (this.recentComments.length > this.config.contextWindowSize) {
      this.recentComments.shift();
    }
  }

  /**
   * 匹配规则
   */
  private matchRules(text: string): IntentRule {
    let bestMatch: IntentRule | null = null;
    let bestScore = 0;

    INTENT_RULES.forEach(rule => {
      const score = this.calculateMatchScore(text, rule);

      if (score > bestScore && score >= this.config.minConfidence) {
        bestScore = score;
        bestMatch = rule;
      }
    });

    // 如果没有匹配，返回默认闲聊
    if (!bestMatch) {
      return {
        type: 'general_chat',
        patterns: [],
        keywords: [],
        confidence: 0.5,
        conversionProbability: 'low',
      };
    }

    return bestMatch;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(text: string, rule: IntentRule): number {
    let score = 0;
    let matchCount = 0;

    // 模式匹配
    rule.patterns.forEach(pattern => {
      if (pattern.test(text)) {
        score += 0.5;
        matchCount++;
      }
    });

    // 关键词匹配
    rule.keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 0.3;
        matchCount++;
      }
    });

    // 归一化
    const normalizedScore = matchCount > 0 ? score / matchCount : 0;

    // 结合规则的基准置信度
    return normalizedScore * rule.confidence;
  }

  /**
   * 清空上下文
   */
  clearContext(): void {
    this.recentComments = [];
  }

  /**
   * 获取最近评论
   */
  getRecentComments(): string[] {
    return this.recentComments.slice();
  }
}

/**
 * 导出便捷函数
 */
export function createIntentParser(
  config?: Partial<IntentParserConfig>
): IntentParser {
  return new IntentParser(config);
}

/**
 * 导出规则供测试使用
 */
export { INTENT_RULES };
