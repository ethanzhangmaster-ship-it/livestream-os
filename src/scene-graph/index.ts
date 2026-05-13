/**
 * SceneGraph Builder
 * 核心职责：管理场景结构，验证转换合法性
 */

import {
  SceneNode,
  SceneTransition,
  SceneGraph,
  Action,
  Violation,
} from '../types';

/**
 * 预定义场景模板
 */
const DEFAULT_SCENES: SceneNode[] = [
  {
    id: 'hook',
    name: '开场 Hook',
    type: 'hook',
    duration: 4000,
    overlays: ['hook_text', 'interaction_prompt'],
    products: [],
  },
  {
    id: 'product_intro',
    name: '产品介绍',
    type: 'narration',
    duration: 15000,
    overlays: ['product_info_card', 'price_tag'],
    products: ['cat_food_001', 'cat_food_002'],
  },
  {
    id: 'palatability_demo',
    name: '适口性演示',
    type: 'demo',
    duration: 20000,
    overlays: ['picky_eating_badge', 'eating_video'],
    products: ['cat_food_001'],
  },
  {
    id: 'price_promotion',
    name: '价格促销',
    type: 'stats',
    duration: 10000,
    overlays: ['discount_badge', 'buy_button'],
    products: ['cat_food_001', 'cat_food_002'],
  },
  {
    id: 'checkout_guide',
    name: '下单引导',
    type: 'cta',
    duration: 8000,
    overlays: ['buy_button', 'qr_code'],
    products: ['cat_food_001', 'cat_food_002'],
  },
  {
    id: 'interactive_hook',
    name: '互动场景',
    type: 'hook',
    duration: 10000,
    overlays: ['interaction_prompt', 'thanks_badge'],
    products: [],
  },
  {
    id: 'objection_handling',
    name: '异议处理',
    type: 'qa',
    duration: 12000,
    overlays: ['faq_card', 'trust_badge'],
    products: [],
  },
  {
    id: 'product_comparison',
    name: '产品对比',
    type: 'stats',
    duration: 15000,
    overlays: ['comparison_table', 'feature_highlight'],
    products: ['cat_food_001', 'cat_food_002'],
  },
];

/**
 * 预定义转换规则
 */
const DEFAULT_TRANSITIONS: SceneTransition[] = [
  // Hook 可以转换到任何场景
  { from: 'hook', to: 'product_intro', priority: 5 },
  { from: 'hook', to: 'palatability_demo', priority: 6 },
  { from: 'hook', to: 'price_promotion', priority: 4 },
  { from: 'hook', to: 'interactive_hook', priority: 3 },

  // 产品介绍可以转换到
  { from: 'product_intro', to: 'palatability_demo', priority: 7 },
  { from: 'product_intro', to: 'price_promotion', priority: 6 },
  { from: 'product_intro', to: 'checkout_guide', priority: 5 },

  // 适口性演示可以转换到
  { from: 'palatability_demo', to: 'checkout_guide', priority: 8 },
  { from: 'palatability_demo', to: 'price_promotion', priority: 6 },
  { from: 'palatability_demo', to: 'product_intro', priority: 4 },

  // 价格促销可以转换到
  { from: 'price_promotion', to: 'checkout_guide', priority: 9 },
  { from: 'price_promotion', to: 'palatability_demo', priority: 5 },

  // 互动场景可以转换到
  { from: 'interactive_hook', to: 'product_intro', priority: 6 },
  { from: 'interactive_hook', to: 'palatability_demo', priority: 5 },

  // 异议处理可以转换到
  { from: 'objection_handling', to: 'palatability_demo', priority: 7 },
  { from: 'objection_handling', to: 'price_promotion', priority: 6 },
  { from: 'objection_handling', to: 'checkout_guide', priority: 5 },

  // 产品对比可以转换到
  { from: 'product_comparison', to: 'checkout_guide', priority: 7 },
  { from: 'product_comparison', to: 'price_promotion', priority: 6 },

  // 下单引导可以转换到（循环）
  { from: 'checkout_guide', to: 'hook', priority: 5 },
  { from: 'checkout_guide', to: 'product_intro', priority: 4 },
];

/**
 * SceneGraph Builder 类
 */
export class SceneGraphBuilder {
  private graph: SceneGraph;
  private violations: Violation[] = [];

  constructor(
    scenes: SceneNode[] = DEFAULT_SCENES,
    transitions: SceneTransition[] = DEFAULT_TRANSITIONS
  ) {
    this.graph = this.initializeGraph(scenes, transitions);
  }

  /**
   * 验证动作
   */
  validateAction(action: Action): Violation[] {
    this.violations = [];

    switch (action.type) {
      case 'scene_switch':
        this.validateSceneSwitch(action.target);
        break;

      case 'overlay_show':
        this.validateOverlay(action.target);
        break;

      case 'overlay_hide':
        this.validateOverlay(action.target);
        break;

      case 'product_highlight':
        this.validateProduct(action.sku);
        break;

      case 'text_update':
        this.validateElement(action.element);
        break;
    }

    return this.violations;
  }

  /**
   * 执行动作
   */
  applyAction(action: Action): boolean {
    const violations = this.validateAction(action);

    // 如果有 hard violation，拒绝执行
    if (violations.some(v => v.severity === 'hard')) {
      return false;
    }

    // 执行动作
    switch (action.type) {
      case 'scene_switch':
        this.switchScene(action.target);
        break;

      case 'overlay_show':
        this.showOverlay(action.target);
        break;

      case 'overlay_hide':
        this.hideOverlay(action.target);
        break;

      case 'product_highlight':
        this.highlightProduct(action.sku);
        break;

      case 'text_update':
        this.updateText(action.element, action.content);
        break;

      case 'auto_reply':
        // Auto reply 不影响 SceneGraph
        break;
    }

    return true;
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): SceneNode | null {
    return this.graph.nodes.get(this.graph.activeNode) || null;
  }

  /**
   * 获取场景图
   */
  getGraph(): SceneGraph {
    return this.graph;
  }

  /**
   * 获取可转换的目标场景
   */
  getValidTransitions(): string[] {
    const currentScene = this.graph.activeNode;

    return this.graph.edges
      .filter(edge => edge.from === currentScene)
      .sort((a, b) => b.priority - a.priority)
      .map(edge => edge.to);
  }

  /**
   * 重置到初始场景
   */
  reset(): void {
    this.graph.activeNode = 'hook';
    this.graph.history = ['hook'];
  }

  /**
   * 初始化场景图
   */
  private initializeGraph(
    scenes: SceneNode[],
    transitions: SceneTransition[]
  ): SceneGraph {
    const nodes = new Map<string, SceneNode>();

    scenes.forEach(scene => {
      nodes.set(scene.id, scene);
    });

    return {
      nodes,
      edges: transitions,
      activeNode: 'hook',
      history: ['hook'],
    };
  }

  /**
   * 验证场景切换
   */
  private validateSceneSwitch(targetScene: string): void {
    const currentScene = this.graph.activeNode;

    // 检查目标场景是否存在
    if (!this.graph.nodes.has(targetScene)) {
      this.violations.push({
        type: 'invalid_scene',
        severity: 'hard',
        message: `目标场景 "${targetScene}" 不存在`,
        details: { targetScene },
      });
      return;
    }

    // 检查转换是否允许
    const isAllowed = this.graph.edges.some(
      edge => edge.from === currentScene && edge.to === targetScene
    );

    if (!isAllowed) {
      this.violations.push({
        type: 'invalid_transition',
        severity: 'hard',
        message: `不允许从 "${currentScene}" 转换到 "${targetScene}"`,
        details: { from: currentScene, to: targetScene },
      });
    }

    // 检查 Hook 场景时长
    const targetNode = this.graph.nodes.get(targetScene);
    if (targetNode && targetNode.type === 'hook' && targetNode.duration && targetNode.duration > 4000) {
      this.violations.push({
        type: 'hook_duration_exceeded',
        severity: 'hard',
        message: `Hook 场景时长不能超过 4 秒`,
        details: { duration: targetNode.duration },
      });
    }
  }

  /**
   * 验证贴片
   */
  private validateOverlay(overlayId: string): void {
    const currentScene = this.getCurrentScene();

    if (!currentScene) {
      this.violations.push({
        type: 'no_active_scene',
        severity: 'hard',
        message: '没有活动场景',
      });
      return;
    }

    // 检查贴片是否属于当前场景
    if (!currentScene.overlays.includes(overlayId)) {
      this.violations.push({
        type: 'overlay_not_in_scene',
        severity: 'soft',
        message: `贴片 "${overlayId}" 不属于当前场景`,
        details: { overlayId, scene: currentScene.id },
      });
    }
  }

  /**
   * 验证产品
   */
  private validateProduct(productId: string): void {
    const currentScene = this.getCurrentScene();

    if (!currentScene) {
      this.violations.push({
        type: 'no_active_scene',
        severity: 'hard',
        message: '没有活动场景',
      });
      return;
    }

    // 检查产品是否属于当前场景
    if (currentScene.products && !currentScene.products.includes(productId)) {
      this.violations.push({
        type: 'product_not_in_scene',
        severity: 'soft',
        message: `产品 "${productId}" 不属于当前场景`,
        details: { productId, scene: currentScene.id },
      });
    }
  }

  /**
   * 验证元素
   */
  private validateElement(elementId: string): void {
    // 简化版：假设所有元素都有效
    // 实际实现需要检查元素是否存在于当前场景
  }

  /**
   * 切换场景
   */
  private switchScene(targetScene: string): void {
    this.graph.activeNode = targetScene;
    this.graph.history.push(targetScene);
  }

  /**
   * 显示贴片
   */
  private showOverlay(overlayId: string): void {
    // 在实际实现中，这里会更新场景状态
    console.log(`[SceneGraph] 显示贴片: ${overlayId}`);
  }

  /**
   * 隐藏贴片
   */
  private hideOverlay(overlayId: string): void {
    console.log(`[SceneGraph] 隐藏贴片: ${overlayId}`);
  }

  /**
   * 高亮产品
   */
  private highlightProduct(productId: string): void {
    console.log(`[SceneGraph] 高亮产品: ${productId}`);
  }

  /**
   * 更新文字
   */
  private updateText(elementId: string, content: string): void {
    console.log(`[SceneGraph] 更新文字 ${elementId}: ${content}`);
  }
}

/**
 * 导出便捷函数
 */
export function createSceneGraphBuilder(
  scenes?: SceneNode[],
  transitions?: SceneTransition[]
): SceneGraphBuilder {
  return new SceneGraphBuilder(scenes, transitions);
}

/**
 * 导出默认场景和转换供测试使用
 */
export { DEFAULT_SCENES, DEFAULT_TRANSITIONS };
