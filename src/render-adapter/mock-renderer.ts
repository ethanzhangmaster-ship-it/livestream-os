/**
 * Mock Renderer
 * 用于在没有 OBS 时验证系统闭环
 */

import { Action, RuntimeDecision } from '../types';

export interface RenderEvent {
  timestamp: number;
  action: Action;
  success: boolean;
  message?: string;
}

/**
 * Mock Renderer 类
 */
export class MockRenderer {
  private events: RenderEvent[] = [];
  private currentScene: string = 'hook';
  private visibleOverlays: Set<string> = new Set();
  private highlightedProducts: Set<string> = new Set();
  private textContents: Map<string, string> = new Map();

  /**
   * 执行动作
   */
  execute(action: Action): RenderEvent {
    const event: RenderEvent = {
      timestamp: Date.now(),
      action,
      success: true,
    };

    try {
      switch (action.type) {
        case 'scene_switch':
          this.handleSceneSwitch(action);
          event.message = `场景切换: ${this.currentScene} → ${action.target}`;
          break;

        case 'overlay_show':
          this.handleOverlayShow(action);
          event.message = `显示贴片: ${action.target}`;
          break;

        case 'overlay_hide':
          this.handleOverlayHide(action);
          event.message = `隐藏贴片: ${action.target}`;
          break;

        case 'auto_reply':
          this.handleAutoReply(action);
          event.message = `自动回复: "${action.text}"`;
          break;

        case 'product_highlight':
          this.handleProductHighlight(action);
          event.message = `高亮产品: ${action.sku}`;
          break;

        case 'text_update':
          this.handleTextUpdate(action);
          event.message = `更新文字 ${action.element}: "${action.content}"`;
          break;
      }
    } catch (error) {
      event.success = false;
      event.message = `执行失败: ${error}`;
    }

    this.events.push(event);
    return event;
  }

  /**
   * 批量执行动作
   */
  executeBatch(actions: Action[]): RenderEvent[] {
    return actions.map(action => this.execute(action));
  }

  /**
   * 执行决策
   */
  executeDecision(decision: RuntimeDecision): RenderEvent[] {
    console.log(`\n[MockRenderer] 执行决策 ${decision.decisionId}`);
    console.log(`  推理: ${decision.reasoning}`);
    console.log(`  预期影响: 注意力 +${(decision.expectedImpact.attention * 100).toFixed(0)}%, 转化 +${(decision.expectedImpact.conversion * 100).toFixed(0)}%`);

    return this.executeBatch(decision.actions);
  }

  /**
   * 获取当前状态
   */
  getState(): {
    currentScene: string;
    visibleOverlays: string[];
    highlightedProducts: string[];
    textContents: Record<string, string>;
  } {
    return {
      currentScene: this.currentScene,
      visibleOverlays: Array.from(this.visibleOverlays),
      highlightedProducts: Array.from(this.highlightedProducts),
      textContents: Object.fromEntries(this.textContents),
    };
  }

  /**
   * 获取执行历史
   */
  getHistory(): RenderEvent[] {
    return this.events.slice();
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.events = [];
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.currentScene = 'hook';
    this.visibleOverlays.clear();
    this.highlightedProducts.clear();
    this.textContents.clear();
    this.events = [];
  }

  /**
   * 打印当前状态
   */
  printState(): void {
    console.log('\n[MockRenderer] 当前状态:');
    console.log(`  场景: ${this.currentScene}`);
    console.log(`  可见贴片: [${Array.from(this.visibleOverlays).join(', ')}]`);
    console.log(`  高亮产品: [${Array.from(this.highlightedProducts).join(', ')}]`);

    if (this.textContents.size > 0) {
      console.log('  文字内容:');
      this.textContents.forEach((content, element) => {
        console.log(`    ${element}: "${content}"`);
      });
    }
  }

  /**
   * 处理场景切换
   */
  private handleSceneSwitch(action: { type: 'scene_switch'; target: string; transition?: string }): void {
    console.log(`\n  [MockRenderer] 切换场景: ${this.currentScene} → ${action.target} (${action.transition || 'instant'})`);
    this.currentScene = action.target;
    this.visibleOverlays.clear();
    this.highlightedProducts.clear();
  }

  /**
   * 处理显示贴片
   */
  private handleOverlayShow(action: { type: 'overlay_show'; target: string; duration?: number }): void {
    this.visibleOverlays.add(action.target);
    console.log(`  [MockRenderer] 显示贴片: ${action.target}${action.duration ? ` (${action.duration}ms)` : ''}`);

    // 如果有持续时间，设置自动隐藏
    if (action.duration) {
      setTimeout(() => {
        this.visibleOverlays.delete(action.target);
        console.log(`  [MockRenderer] 自动隐藏贴片: ${action.target}`);
      }, action.duration);
    }
  }

  /**
   * 处理隐藏贴片
   */
  private handleOverlayHide(action: { type: 'overlay_hide'; target: string }): void {
    this.visibleOverlays.delete(action.target);
    console.log(`  [MockRenderer] 隐藏贴片: ${action.target}`);
  }

  /**
   * 处理自动回复
   */
  private handleAutoReply(action: { type: 'auto_reply'; text: string; voice?: boolean }): void {
    console.log(`  [MockRenderer] 自动回复: "${action.text}"${action.voice ? ' (语音)' : ''}`);
  }

  /**
   * 处理产品高亮
   */
  private handleProductHighlight(action: { type: 'product_highlight'; sku: string }): void {
    this.highlightedProducts.add(action.sku);
    console.log(`  [MockRenderer] 高亮产品: ${action.sku}`);
  }

  /**
   * 处理文字更新
   */
  private handleTextUpdate(action: { type: 'text_update'; element: string; content: string }): void {
    this.textContents.set(action.element, action.content);
    console.log(`  [MockRenderer] 更新文字 ${action.element}: "${action.content}"`);
  }
}

/**
 * 导出便捷函数
 */
export function createMockRenderer(): MockRenderer {
  return new MockRenderer();
}
