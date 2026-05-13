/**
 * Runtime Engine
 * 核心职责：解释 DSL，评估规则，做出决策
 * 设计原则：Scene 是 dumb 的，智能在 Runtime Layer
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Intent,
  Action,
  RuntimeDecision,
  AttentionState,
  SceneGraph,
  RuntimeConfig,
} from '../types';

export interface RuntimeEngineConfig extends Partial<RuntimeConfig> {
  enableAutoReply: boolean;
  enableSceneSwitch: boolean;
  enableOverlay: boolean;
  enableProductHighlight: boolean;
}

const DEFAULT_CONFIG: RuntimeEngineConfig = {
  thresholds: {
    hookDurationMax: 4000,
    avgAttentionMin: 0.5,
    dropRiskMax: 0.6,
    mutationStepSizeMax: 0.3,
    convergenceScoreMin: 0.7,
  },
  windows: {
    attentionAggregationMs: 5000,
    intentContextSize: 10,
    momentumCalculationMs: 15000,
  },
  safety: {
    maxMutationCycles: 100,
    stabilityTestCycles: 100,
  },
  enableAutoReply: true,
  enableSceneSwitch: true,
  enableOverlay: true,
  enableProductHighlight: true,
};

/**
 * 决策规则定义
 */
interface DecisionRule {
  name: string;
  condition: (intent: Intent, state: AttentionState) => boolean;
  actions: (intent: Intent, state: AttentionState) => Action[];
  priority: number;
  reasoning: string;
}

const DECISION_RULES: DecisionRule[] = [
  // 规则 1: 购买犹豫 → 适口性演示
  {
    name: 'purchase_hesitation_handler',
    condition: (intent, state) => {
      return (
        intent.type === 'purchase_hesitation' &&
        intent.confidence > 0.8 &&
        state.pattern === 'purchase_hesitation'
      );
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 切换到适口性演示场景
      if (intent.recommendedScene) {
        actions.push({
          type: 'scene_switch',
          target: intent.recommendedScene,
          transition: 'fade',
        });
      }

      // 显示适口性徽章
      actions.push({
        type: 'overlay_show',
        target: 'picky_eating_badge',
        duration: 10000,
      });

      // 自动回复
      actions.push({
        type: 'auto_reply',
        text: '我家这只以前也挑，现在吃得可香了~',
        voice: true,
      });

      // 高亮产品
      if (intent.conversionProbability === 'high') {
        actions.push({
          type: 'product_highlight',
          sku: 'cat_food_001',
        });
      }

      return actions;
    },
    priority: 10,
    reasoning: '检测到购买犹豫，触发适口性演示场景 + 自动回复 + 产品高亮',
  },

  // 规则 2: 价格敏感 → 优惠促销
  {
    name: 'price_sensitivity_handler',
    condition: (intent, state) => {
      return (
        intent.type === 'price_sensitivity' &&
        intent.confidence > 0.75 &&
        state.density > 0.4
      );
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 切换到价格促销场景
      actions.push({
        type: 'scene_switch',
        target: 'price_promotion',
      });

      // 显示优惠贴片
      actions.push({
        type: 'overlay_show',
        target: 'discount_badge',
        duration: 15000,
      });

      // 自动回复
      actions.push({
        type: 'auto_reply',
        text: '现在下单有优惠哦，限时 9 折！',
        voice: true,
      });

      return actions;
    },
    priority: 9,
    reasoning: '检测到价格敏感，触发优惠促销场景',
  },

  // 规则 3: 流失风险 → 强互动
  {
    name: 'drop_risk_handler',
    condition: (intent, state) => {
      return state.pattern === 'drop_risk' && state.density < 0.3;
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 切换到互动场景
      actions.push({
        type: 'scene_switch',
        target: 'interactive_hook',
      });

      // 显示互动提示
      actions.push({
        type: 'overlay_show',
        target: 'interaction_prompt',
        duration: 8000,
      });

      // 更新文字
      actions.push({
        type: 'text_update',
        element: 'hook_text',
        content: '留言互动有惊喜哦~',
      });

      return actions;
    },
    priority: 10,
    reasoning: '检测到流失风险，触发强互动场景',
  },

  // 规则 4: 高互动 → 维持当前场景
  {
    name: 'high_engagement_maintainer',
    condition: (intent, state) => {
      return state.pattern === 'engagement_high' && state.momentum > 0.1;
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 显示感谢贴片
      actions.push({
        type: 'overlay_show',
        target: 'thanks_badge',
        duration: 5000,
      });

      return actions;
    },
    priority: 5,
    reasoning: '高互动状态，维持当前场景并表示感谢',
  },

  // 规则 5: 购买信号 → 引导下单
  {
    name: 'readiness_signal_handler',
    condition: (intent, state) => {
      return intent.type === 'readiness_signal' && intent.confidence > 0.85;
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 切换到下单引导场景
      actions.push({
        type: 'scene_switch',
        target: 'checkout_guide',
      });

      // 显示下单按钮
      actions.push({
        type: 'overlay_show',
        target: 'buy_button',
        duration: 20000,
      });

      // 自动回复
      actions.push({
        type: 'auto_reply',
        text: '点击下方链接即可下单，发货很快哦~',
        voice: true,
      });

      return actions;
    },
    priority: 10,
    reasoning: '检测到购买信号，引导下单',
  },

  // 规则 6: 产品咨询 → 产品介绍
  {
    name: 'product_inquiry_handler',
    condition: (intent, state) => {
      return intent.type === 'product_inquiry' && intent.confidence > 0.7;
    },
    actions: (intent, state) => {
      const actions: Action[] = [];

      // 切换到产品介绍场景
      if (intent.recommendedScene) {
        actions.push({
          type: 'scene_switch',
          target: intent.recommendedScene,
        });
      }

      // 显示产品信息贴片
      actions.push({
        type: 'overlay_show',
        target: 'product_info_card',
        duration: 12000,
      });

      return actions;
    },
    priority: 7,
    reasoning: '检测到产品咨询，展示产品信息',
  },
];

/**
 * Runtime Engine 类
 */
export class RuntimeEngine {
  private config: RuntimeEngineConfig;
  private decisionHistory: RuntimeDecision[] = [];
  private sessionStartTime: number;

  constructor(config: Partial<RuntimeEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionStartTime = Date.now();
  }

  /**
   * 做出决策
   */
  decide(intent: Intent, attentionState: AttentionState): RuntimeDecision {
    // 匹配规则
    const matchedRules = this.matchRules(intent, attentionState);

    // 按优先级排序
    matchedRules.sort((a, b) => b.priority - a.priority);

    // 选择最高优先级规则
    const selectedRule = matchedRules[0];

    // 生成动作
    const actions = selectedRule
      ? this.filterActions(selectedRule.actions(intent, attentionState))
      : [];

    // 构建决策对象
    const decision: RuntimeDecision = {
      decisionId: uuidv4(),
      triggerIntent: intent,
      actions,
      reasoning: selectedRule?.reasoning || '无匹配规则，维持当前状态',
      expectedImpact: this.estimateImpact(intent, attentionState),
      timestamp: Date.now(),
    };

    // 记录决策历史
    this.decisionHistory.push(decision);

    return decision;
  }

  /**
   * 批量决策
   */
  decideBatch(
    intents: Intent[],
    attentionState: AttentionState
  ): RuntimeDecision[] {
    return intents.map(intent => this.decide(intent, attentionState));
  }

  /**
   * 匹配规则
   */
  private matchRules(intent: Intent, state: AttentionState): DecisionRule[] {
    return DECISION_RULES.filter(rule => rule.condition(intent, state));
  }

  /**
   * 过滤动作（根据配置）
   */
  private filterActions(actions: Action[]): Action[] {
    return actions.filter(action => {
      switch (action.type) {
        case 'auto_reply':
          return this.config.enableAutoReply;
        case 'scene_switch':
          return this.config.enableSceneSwitch;
        case 'overlay_show':
        case 'overlay_hide':
          return this.config.enableOverlay;
        case 'product_highlight':
          return this.config.enableProductHighlight;
        default:
          return true;
      }
    });
  }

  /**
   * 估算预期影响
   */
  private estimateImpact(
    intent: Intent,
    state: AttentionState
  ): { attention: number; conversion: number } {
    // 基于意图类型和注意力状态估算
    let attentionImpact = 0;
    let conversionImpact = 0;

    switch (intent.type) {
      case 'purchase_hesitation':
        attentionImpact = 0.3;
        conversionImpact = intent.conversionProbability === 'high' ? 0.5 : 0.2;
        break;

      case 'price_sensitivity':
        attentionImpact = 0.2;
        conversionImpact = 0.4;
        break;

      case 'readiness_signal':
        attentionImpact = 0.1;
        conversionImpact = 0.7;
        break;

      default:
        attentionImpact = 0.1;
        conversionImpact = 0.1;
    }

    // 根据当前注意力状态调整
    if (state.pattern === 'drop_risk') {
      attentionImpact = 0.5;
      conversionImpact = 0.1;
    }

    if (state.density < (this.config.thresholds?.avgAttentionMin || 0.5)) {
      attentionImpact *= 1.5; // 低注意力时影响更大
    }

    return {
      attention: Math.min(attentionImpact, 1),
      conversion: Math.min(conversionImpact, 1),
    };
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(): RuntimeDecision[] {
    return this.decisionHistory.slice();
  }

  /**
   * 清空决策历史
   */
  clearHistory(): void {
    this.decisionHistory = [];
  }

  /**
   * 获取会话时长
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * 重置会话
   */
  resetSession(): void {
    this.sessionStartTime = Date.now();
    this.decisionHistory = [];
  }
}

/**
 * 导出便捷函数
 */
export function createRuntimeEngine(
  config?: Partial<RuntimeEngineConfig>
): RuntimeEngine {
  return new RuntimeEngine(config);
}

/**
 * 导出规则供测试使用
 */
export { DECISION_RULES };
