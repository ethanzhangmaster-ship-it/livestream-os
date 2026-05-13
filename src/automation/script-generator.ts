/**
 * 话术生成引擎
 * 
 * 根据直播场景、观众互动、产品信息，自动生成直播话术
 */

import { ScriptTemplate, getBestTemplate } from './script-templates';
import { AttentionState, Intent } from '../types';

/**
 * 产品信息
 */
export interface ProductInfo {
  name: string;              // 产品名称
  price: number;             // 价格
  ingredient: string;        // 配方成分
  benefits: string[];        // 功效列表
  stock: number;             // 库存
  feedback: string;          // 用户反馈
  valueProposition: string;  // 价值主张
}

/**
 * 促销信息
 */
export interface PromotionInfo {
  discount: number;          // 折扣金额
  buyCount: number;          // 购买数量
  getCount: number;          // 获得数量
  bundleType: string;        // 套餐类型
  gift: string;              // 赠品
  saveAmount: number;        // 节省金额
}

/**
 * 会话上下文
 */
export interface SessionContext {
  anchorName: string;        // 主播名称
  birdName: string;          // 鸟的名字
  product: ProductInfo;      // 产品信息
  promotion: PromotionInfo;  // 促销信息
  sessionDuration: number;   // 会话时长
  viewerCount: number;       // 观众数
}

/**
 * 话术生成结果
 */
export interface GeneratedScript {
  template: ScriptTemplate;
  script: string;
  variables: Record<string, string>;
  confidence: number;
}

/**
 * 话术生成引擎
 */
export class ScriptGenerator {
  private context: SessionContext;
  private scriptHistory: GeneratedScript[] = [];

  constructor(context: SessionContext) {
    this.context = context;
  }

  /**
   * 更新上下文
   */
  updateContext(updates: Partial<SessionContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 根据场景和触发条件生成话术
   */
  generateScript(scene: string, trigger: string): GeneratedScript | null {
    // 1. 获取最佳模板
    const template = getBestTemplate(scene, trigger);
    
    if (!template) {
      console.log(`[ScriptGenerator] 未找到匹配的模板: scene=${scene}, trigger=${trigger}`);
      return null;
    }

    // 2. 填充变量
    const variables = this.fillVariables(template.variables);
    
    // 3. 替换模板中的变量
    let script = template.template;
    for (const [key, value] of Object.entries(variables)) {
      script = script.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // 4. 计算置信度
    const confidence = this.calculateConfidence(template, variables);

    const result: GeneratedScript = {
      template,
      script,
      variables,
      confidence,
    };

    // 5. 记录历史
    this.scriptHistory.push(result);

    return result;
  }

  /**
   * 根据注意力和意图推荐话术
   */
  recommendScript(attentionState: AttentionState, intent: Intent): GeneratedScript | null {
    // 1. 确定场景
    const scene = this.inferScene(attentionState, intent);
    
    // 2. 确定触发条件
    const trigger = this.inferTrigger(attentionState, intent);
    
    // 3. 生成话术
    return this.generateScript(scene, trigger);
  }

  /**
   * 批量生成话术
   */
  batchGenerate(requests: Array<{ scene: string; trigger: string }>): GeneratedScript[] {
    return requests
      .map(req => this.generateScript(req.scene, req.trigger))
      .filter((result): result is GeneratedScript => result !== null);
  }

  /**
   * 填充变量
   */
  private fillVariables(variableNames: string[]): Record<string, string> {
    const variables: Record<string, string> = {};

    for (const name of variableNames) {
      variables[name] = this.getVariableValue(name);
    }

    return variables;
  }

  /**
   * 获取变量值
   */
  private getVariableValue(name: string): string {
    const { product, promotion, anchorName, birdName } = this.context;

    const variableMap: Record<string, string> = {
      // 产品相关
      product_name: product.name,
      product_benefit: product.benefits[0] || '',
      key_feature: product.benefits.slice(0, 2).join('、'),
      ingredient: product.ingredient,
      benefit_1: product.benefits[0] || '',
      benefit_2: product.benefits[1] || '',
      additional_benefit: product.benefits[2] || '',
      feedback: product.feedback,
      value_proposition: product.valueProposition,
      price: product.price.toString(),
      stock: product.stock.toString(),

      // 促销相关
      discount: promotion.discount.toString(),
      buy_count: promotion.buyCount.toString(),
      get_count: promotion.getCount.toString(),
      bundle_type: promotion.bundleType,
      gift: promotion.gift,
      save_amount: promotion.saveAmount.toString(),
      discount_info: `立减${promotion.discount}元`,
      promotion_info: `拍${promotion.buyCount}发${promotion.getCount}，还送${promotion.gift}`,

      // 主播相关
      anchor_name: anchorName,
      bird_name: birdName,

      // 用法相关
      usage_steps: '每天喂食2-3次，每次一小勺',
      recommendation: '根据鸟的体型调整用量',
      small_amount: '5-10克',
      medium_amount: '10-20克',

      // 证明相关
      proof: '很多鸟友反馈效果很好',
      answer: '这是一个很好的问题',

      // 其他
      user_name: '这位朋友',
      action: '关注',
      minutes: '10',
    };

    return variableMap[name] || `{${name}}`;
  }

  /**
   * 推断场景
   */
  private inferScene(attentionState: AttentionState, intent: Intent): string {
    // 根据注意力和意图推断最合适的场景
    if (attentionState.density < 0.3) {
      return '开场欢迎';
    }

    if (intent.type === 'purchase_hesitation') {
      return '喂食演示';
    }

    if (intent.type === 'price_sensitivity') {
      return '优惠活动';
    }

    if (intent.type === 'product_inquiry') {
      return '产品展示';
    }

    if (attentionState.density > 0.7) {
      return '优惠活动';
    }

    return '产品展示';
  }

  /**
   * 推断触发条件
   */
  private inferTrigger(attentionState: AttentionState, intent: Intent): string {
    // 根据注意力和意图推断触发条件
    if (intent.type === 'purchase_hesitation') {
      return 'purchase_hesitation';
    }

    if (intent.type === 'readiness_signal') {
      return 'purchase_signal';
    }

    if (intent.type === 'product_inquiry') {
      return 'product_inquiry';
    }

    if (attentionState.density > 0.7) {
      return 'high_attention';
    }

    if (attentionState.density < 0.3) {
      return 'low_attention';
    }

    if (attentionState.momentum > 0.1) {
      return 'high_engagement';
    }

    return 'normal';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    template: ScriptTemplate,
    variables: Record<string, string>
  ): number {
    // 检查变量是否都已填充
    const filledVariables = Object.values(variables).filter(v => !v.startsWith('{')).length;
    const totalVariables = Object.keys(variables).length;
    
    const fillRate = totalVariables > 0 ? filledVariables / totalVariables : 1;
    
    // 基础置信度 = 模板优先级 / 10
    const baseConfidence = template.priority / 10;
    
    // 最终置信度 = 基础置信度 * 填充率
    return baseConfidence * fillRate;
  }

  /**
   * 获取话术历史
   */
  getHistory(): GeneratedScript[] {
    return this.scriptHistory;
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.scriptHistory = [];
  }

  /**
   * 获取最近的话术
   */
  getLatestScript(): GeneratedScript | null {
    return this.scriptHistory[this.scriptHistory.length - 1] || null;
  }
}

/**
 * 默认产品信息
 */
export const DEFAULT_PRODUCT_INFO: ProductInfo = {
  name: '鹦鹉滋养丸',
  price: 68,
  ingredient: '天然谷物+维生素+矿物质',
  benefits: [
    '营养均衡',
    '美毛亮羽',
    '增强体质',
    '提高免疫力',
  ],
  stock: 100,
  feedback: '效果很好，鸟宝很爱吃',
  valueProposition: '营养均衡，长期喂养更健康',
};

/**
 * 默认促销信息
 */
export const DEFAULT_PROMOTION_INFO: PromotionInfo = {
  discount: 5,
  buyCount: 2,
  getCount: 5,
  bundleType: '发同款',
  gift: '手提桶',
  saveAmount: 20,
};

/**
 * 默认会话上下文
 */
export const DEFAULT_SESSION_CONTEXT: SessionContext = {
  anchorName: '主播',
  birdName: '虎皮鹦鹉',
  product: DEFAULT_PRODUCT_INFO,
  promotion: DEFAULT_PROMOTION_INFO,
  sessionDuration: 0,
  viewerCount: 0,
};
