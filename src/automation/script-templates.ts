/**
 * 话术模板库
 * 
 * 根据直播场景、观众互动、产品信息，自动生成直播话术
 */

export interface ScriptTemplate {
  id: string;
  scene: string;          // 适用场景
  trigger: string;        // 触发条件
  template: string;       // 话术模板
  variables: string[];    // 变量列表
  priority: number;       // 优先级
  category: 'opening' | 'product' | 'promotion' | 'interaction' | 'closing';
}

/**
 * 话术模板库
 * 
 * 左侧：模板 ID
 * 右侧：模板配置
 */
export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  // ==================== 开场话术 ====================
  {
    id: 'opening_welcome',
    scene: '开场欢迎',
    trigger: 'session_start',
    template: '欢迎来到直播间！今天给大家带来的是{product_name}，{product_benefit}。现在下单还有专属福利哦~',
    variables: ['product_name', 'product_benefit'],
    priority: 10,
    category: 'opening',
  },
  {
    id: 'opening_intro',
    scene: '开场欢迎',
    trigger: 'low_attention',
    template: '大家好！我是{anchor_name}，今天给大家分享{product_name}。这款产品{key_feature}，很多鸟友都在用~',
    variables: ['anchor_name', 'product_name', 'key_feature'],
    priority: 9,
    category: 'opening',
  },
  {
    id: 'opening_hook',
    scene: '开场欢迎',
    trigger: 'new_viewer',
    template: '刚进来的朋友看过来！这款{product_name}现在{promotion_info}，错过就亏了~',
    variables: ['product_name', 'promotion_info'],
    priority: 8,
    category: 'opening',
  },

  // ==================== 产品介绍话术 ====================
  {
    id: 'product_intro_basic',
    scene: '产品展示',
    trigger: 'product_inquiry',
    template: '这款{product_name}采用{ingredient}配方，{benefit_1}、{benefit_2}。很多鸟友反馈{feedback}~',
    variables: ['product_name', 'ingredient', 'benefit_1', 'benefit_2', 'feedback'],
    priority: 8,
    category: 'product',
  },
  {
    id: 'product_intro_detail',
    scene: '产品展示',
    trigger: 'high_attention',
    template: '给大家详细介绍一下这款{product_name}。它含有{ingredient}，可以{benefit_1}。而且{additional_benefit}，{proof}~',
    variables: ['product_name', 'ingredient', 'benefit_1', 'additional_benefit', 'proof'],
    priority: 7,
    category: 'product',
  },
  {
    id: 'product_demo',
    scene: '喂食演示',
    trigger: 'purchase_hesitation',
    template: '大家看，{bird_name}吃得可香了！这款粮适口性很好，很多挑食的鸟宝都爱吃。满三个月就可以吃啦~',
    variables: ['bird_name'],
    priority: 9,
    category: 'product',
  },
  {
    id: 'product_usage',
    scene: '产品展示',
    trigger: 'usage_inquiry',
    template: '这款{product_name}用法很简单：{usage_steps}。建议{recommendation}~',
    variables: ['product_name', 'usage_steps', 'recommendation'],
    priority: 7,
    category: 'product',
  },

  // ==================== 促销话术 ====================
  {
    id: 'promotion_discount',
    scene: '优惠活动',
    trigger: 'high_attention',
    template: '现在下单立减{discount}元！拍{buy_count}发{get_count}，还送{gift}。库存有限，抓紧时间哦~',
    variables: ['discount', 'buy_count', 'get_count', 'gift'],
    priority: 9,
    category: 'promotion',
  },
  {
    id: 'promotion_urgency',
    scene: '优惠活动',
    trigger: 'purchase_signal',
    template: '这款{product_name}只剩{stock}件了！现在下单{discount_info}，手慢无~',
    variables: ['product_name', 'stock', 'discount_info'],
    priority: 10,
    category: 'promotion',
  },
  {
    id: 'promotion_bundle',
    scene: '优惠活动',
    trigger: 'high_engagement',
    template: '今天直播间专属福利！拍{buy_count}发{get_count}（{bundle_type}），还送{gift}。比平时省{save_amount}元~',
    variables: ['buy_count', 'get_count', 'bundle_type', 'gift', 'save_amount'],
    priority: 9,
    category: 'promotion',
  },
  {
    id: 'promotion_limited',
    scene: '优惠活动',
    trigger: 'session_end',
    template: '最后{minutes}分钟！这款{product_name}直播间专属价{price}元，下单还送{gift}。错过今天就没有了~',
    variables: ['minutes', 'product_name', 'price', 'gift'],
    priority: 10,
    category: 'promotion',
  },

  // ==================== 互动话术 ====================
  {
    id: 'interaction_thanks',
    scene: '开场欢迎',
    trigger: 'user_action',
    template: '感谢{user_name}的{action}！有问题随时问我哦~想了解什么可以打在公屏上！',
    variables: ['user_name', 'action'],
    priority: 7,
    category: 'interaction',
  },
  {
    id: 'interaction_question',
    scene: '开场欢迎',
    trigger: 'low_attention',
    template: '大家在养鸟过程中遇到什么问题吗？可以在评论区留言，我来帮大家解答~',
    variables: [],
    priority: 6,
    category: 'interaction',
  },
  {
    id: 'interaction_encourage',
    scene: '产品展示',
    trigger: 'low_engagement',
    template: '觉得有用的朋友点个赞~有问题可以在评论区留言，看到都会回复的！',
    variables: [],
    priority: 5,
    category: 'interaction',
  },
  {
    id: 'interaction_response',
    scene: '产品展示',
    trigger: 'comment_received',
    template: '{user_name}问得好！{answer}。还有其他问题吗？',
    variables: ['user_name', 'answer'],
    priority: 8,
    category: 'interaction',
  },

  // ==================== 结尾话术 ====================
  {
    id: 'closing_summary',
    scene: '开场欢迎',
    trigger: 'session_end',
    template: '今天的直播就到这里啦！感谢大家的支持。记得关注我，下次直播不见不散~',
    variables: [],
    priority: 8,
    category: 'closing',
  },
  {
    id: 'closing_cta',
    scene: '优惠活动',
    trigger: 'session_end',
    template: '还没下单的朋友抓紧了！这款{product_name}直播间专属价{price}元，下单还送{gift}。点击下方链接即可购买~',
    variables: ['product_name', 'price', 'gift'],
    priority: 9,
    category: 'closing',
  },
  {
    id: 'closing_follow',
    scene: '开场欢迎',
    trigger: 'session_end',
    template: '喜欢的朋友记得点个关注！下次直播我会带来更多好物分享。我们下次见~',
    variables: [],
    priority: 7,
    category: 'closing',
  },

  // ==================== 特殊场景话术 ====================
  {
    id: 'objection_price',
    scene: '优惠活动',
    trigger: 'price_objection',
    template: '我理解您的顾虑。这款粮虽然价格稍高，但{value_proposition}。而且现在下单立减{discount}元，还送{gift}~',
    variables: ['value_proposition', 'discount', 'gift'],
    priority: 9,
    category: 'product',
  },
  {
    id: 'objection_picky',
    scene: '喂食演示',
    trigger: 'picky_eater',
    template: '很多鸟友担心挑食问题。这款粮适口性很好，{proof}。您可以先买试吃装试试，不满意可以退~',
    variables: ['proof'],
    priority: 9,
    category: 'product',
  },
  {
    id: 'objection_age',
    scene: '产品展示',
    trigger: 'age_inquiry',
    template: '满三个月就可以吃啦！根据体型大小调整用量。小型鸟每天{small_amount}，中型鸟{medium_amount}~',
    variables: ['small_amount', 'medium_amount'],
    priority: 8,
    category: 'product',
  },
  {
    id: 'qa_common',
    scene: '产品展示',
    trigger: 'common_question',
    template: '这个问题问得好！{answer}。还有其他问题吗？',
    variables: ['answer'],
    priority: 8,
    category: 'interaction',
  },
];

/**
 * 根据场景和触发条件获取模板
 */
export function getTemplatesByScene(scene: string): ScriptTemplate[] {
  return SCRIPT_TEMPLATES.filter(t => t.scene === scene);
}

/**
 * 根据触发条件获取模板
 */
export function getTemplatesByTrigger(trigger: string): ScriptTemplate[] {
  return SCRIPT_TEMPLATES.filter(t => t.trigger === trigger);
}

/**
 * 根据场景和触发条件获取最佳模板
 */
export function getBestTemplate(scene: string, trigger: string): ScriptTemplate | null {
  const templates = SCRIPT_TEMPLATES.filter(
    t => t.scene === scene && t.trigger === trigger
  );
  
  if (templates.length === 0) {
    return null;
  }
  
  // 返回优先级最高的模板
  return templates.sort((a, b) => b.priority - a.priority)[0];
}

/**
 * 获取所有变量名
 */
export function getAllVariables(): string[] {
  const variables = new Set<string>();
  
  SCRIPT_TEMPLATES.forEach(template => {
    template.variables.forEach(v => variables.add(v));
  });
  
  return Array.from(variables);
}
