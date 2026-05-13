/**
 * 评论分类器
 * 
 * 根据观众评论内容，自动分类并匹配回复模板
 */

/**
 * 评论类型
 */
export type CommentType = 
  | 'product_inquiry'     // 产品咨询
  | 'price_inquiry'       // 价格咨询
  | 'usage_inquiry'       // 用法咨询
  | 'objection'           // 异议
  | 'praise'              // 好评
  | 'interaction'         // 互动
  | 'purchase_signal'     // 购买信号
  | 'complaint';          // 投诉

/**
 * 评论分类
 */
export interface CommentCategory {
  type: CommentType;
  keywords: string[];
  priority: number;
  responseTemplate: string;
}

/**
 * 分类结果
 */
export interface ClassificationResult {
  type: CommentType;
  confidence: number;
  keywords: string[];
  category: CommentCategory;
}

/**
 * 评论分类规则库
 */
export const COMMENT_CATEGORIES: CommentCategory[] = [
  // ==================== 产品咨询 ====================
  {
    type: 'product_inquiry',
    keywords: ['怎么样', '好不好', '效果', '有用吗', '管用吗'],
    priority: 8,
    responseTemplate: '这款{product_name}{benefit}，很多鸟友都在用~',
  },
  {
    type: 'product_inquiry',
    keywords: ['成分', '配方', '原料', '含什么'],
    priority: 8,
    responseTemplate: '这款{product_name}采用{ingredient}配方，{benefit}~',
  },
  {
    type: 'product_inquiry',
    keywords: ['适口性', '挑食', '不吃', '不爱吃'],
    priority: 9,
    responseTemplate: '这款适口性很好，很多鸟宝都爱吃！您可以先买试吃装试试~',
  },

  // ==================== 价格咨询 ====================
  {
    type: 'price_inquiry',
    keywords: ['多少钱', '价格', '贵不贵', '便宜'],
    priority: 9,
    responseTemplate: '这款{product_name}现在直播间专属价{price}元，拍{buy_count}发{get_count}，很划算哦~',
  },
  {
    type: 'price_inquiry',
    keywords: ['活动', '优惠', '折扣', '促销'],
    priority: 9,
    responseTemplate: '现在下单立减{discount}元！拍{buy_count}发{get_count}，还送{gift}~',
  },

  // ==================== 用法咨询 ====================
  {
    type: 'usage_inquiry',
    keywords: ['多大', '几个月', '年龄', '多大可以吃'],
    priority: 8,
    responseTemplate: '满三个月就可以吃啦！根据体型大小调整用量哦~',
  },
  {
    type: 'usage_inquiry',
    keywords: ['怎么喂', '喂多少', '用量', '一天几次'],
    priority: 8,
    responseTemplate: '每天喂食2-3次，每次一小勺。根据鸟的体型调整用量~',
  },
  {
    type: 'usage_inquiry',
    keywords: ['怎么保存', '保质期', '能放多久'],
    priority: 7,
    responseTemplate: '密封保存，保质期12个月。建议放在阴凉干燥处~',
  },

  // ==================== 异议 ====================
  {
    type: 'objection',
    keywords: ['太贵', '买不起', '考虑一下', '再看看'],
    priority: 9,
    responseTemplate: '我理解您的顾虑。这款粮虽然价格稍高，但{value_proposition}。而且现在下单立减{discount}元，还送{gift}~',
  },
  {
    type: 'objection',
    keywords: ['怕不好', '担心', '犹豫'],
    priority: 8,
    responseTemplate: '您可以先买试吃装试试，不满意可以退。很多鸟友反馈效果很好~',
  },

  // ==================== 好评 ====================
  {
    type: 'praise',
    keywords: ['好', '不错', '喜欢', '棒', '赞', '好评'],
    priority: 7,
    responseTemplate: '感谢您的认可！您的支持是我们最大的动力~',
  },
  {
    type: 'praise',
    keywords: ['已买', '下单了', '买了'],
    priority: 8,
    responseTemplate: '感谢您的信任！我们会尽快发货，祝您的鸟宝健康成长~',
  },

  // ==================== 互动 ====================
  {
    type: 'interaction',
    keywords: ['在吗', '有人吗', '主播好', '大家好'],
    priority: 6,
    responseTemplate: '在的！有什么可以帮您的吗？',
  },
  {
    type: 'interaction',
    keywords: ['看看鸟', '看看产品', '展示一下'],
    priority: 7,
    responseTemplate: '好的，马上给您展示！',
  },

  // ==================== 购买信号 ====================
  {
    type: 'purchase_signal',
    keywords: ['怎么买', '哪里买', '链接', '下单'],
    priority: 10,
    responseTemplate: '点击下方购物车即可下单！现在下单立减{discount}元，还送{gift}~',
  },
  {
    type: 'purchase_signal',
    keywords: ['拍几', '买几', '囤货'],
    priority: 9,
    responseTemplate: '建议拍{buy_count}发{get_count}，性价比最高！还送{gift}~',
  },

  // ==================== 投诉 ====================
  {
    type: 'complaint',
    keywords: ['差评', '不好', '质量问题', '退货'],
    priority: 10,
    responseTemplate: '非常抱歉给您带来不好的体验！请联系客服，我们会为您妥善处理~',
  },
];

/**
 * 评论分类器
 */
export class CommentClassifier {
  /**
   * 分类评论
   */
  classify(comment: string): ClassificationResult | null {
    // 1. 匹配关键词
    const matches: Array<{ category: CommentCategory; matchedKeywords: string[] }> = [];

    for (const category of COMMENT_CATEGORIES) {
      const matchedKeywords = category.keywords.filter(keyword => 
        comment.includes(keyword)
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          category,
          matchedKeywords,
        });
      }
    }

    // 2. 如果没有匹配，返回 null
    if (matches.length === 0) {
      return null;
    }

    // 3. 按优先级和匹配关键词数量排序
    matches.sort((a, b) => {
      // 先按优先级排序
      if (b.category.priority !== a.category.priority) {
        return b.category.priority - a.category.priority;
      }
      // 再按匹配关键词数量排序
      return b.matchedKeywords.length - a.matchedKeywords.length;
    });

    // 4. 返回最佳匹配
    const bestMatch = matches[0];
    
    // 5. 计算置信度
    const confidence = this.calculateConfidence(
      bestMatch.matchedKeywords.length,
      bestMatch.category.keywords.length
    );

    return {
      type: bestMatch.category.type,
      confidence,
      keywords: bestMatch.matchedKeywords,
      category: bestMatch.category,
    };
  }

  /**
   * 批量分类
   */
  batchClassify(comments: string[]): Array<ClassificationResult | null> {
    return comments.map(comment => this.classify(comment));
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(matchedCount: number, totalCount: number): number {
    // 匹配的关键词越多，置信度越高
    const matchRate = matchedCount / totalCount;
    
    // 基础置信度 0.5，最高 1.0
    return Math.min(0.5 + matchRate * 0.5, 1.0);
  }

  /**
   * 获取评论类型
   */
  getCommentType(comment: string): CommentType | null {
    const result = this.classify(comment);
    return result?.type || null;
  }

  /**
   * 是否包含购买信号
   */
  hasPurchaseSignal(comment: string): boolean {
    const result = this.classify(comment);
    return result?.type === 'purchase_signal';
  }

  /**
   * 是否包含异议
   */
  hasObjection(comment: string): boolean {
    const result = this.classify(comment);
    return result?.type === 'objection';
  }

  /**
   * 是否需要紧急回复
   */
  needsUrgentReply(comment: string): boolean {
    const result = this.classify(comment);
    if (!result) return false;
    
    // 购买信号、投诉、异议需要紧急回复
    return ['purchase_signal', 'complaint', 'objection'].includes(result.type);
  }
}

/**
 * 创建默认分类器实例
 */
export const commentClassifier = new CommentClassifier();
