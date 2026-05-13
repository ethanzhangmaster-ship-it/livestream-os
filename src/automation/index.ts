/**
 * 自动化模块集成
 * 
 * 将话术生成、自动回复等模块集成到 Runtime Engine
 */

import { ScriptGenerator, DEFAULT_SESSION_CONTEXT, SessionContext } from './script-generator';
import { AutoReplyEngine, Comment, Reply, createAutoReplyEngine } from './auto-reply-engine';
import { AttentionState, Intent, Action } from '../types';

/**
 * 自动化模块配置
 */
export interface AutomationConfig {
  enableScriptGeneration: boolean;    // 启用话术生成
  enableAutoReply: boolean;           // 启用自动回复
  enableVoiceSynthesis: boolean;      // 启用语音合成
  scriptGenerationInterval: number;   // 话术生成间隔（毫秒）
  maxRepliesPerMinute: number;        // 每分钟最大回复数
}

/**
 * 默认配置
 */
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enableScriptGeneration: true,
  enableAutoReply: true,
  enableVoiceSynthesis: false,
  scriptGenerationInterval: 30000, // 30 秒
  maxRepliesPerMinute: 20,
};

/**
 * 自动化模块管理器
 */
export class AutomationManager {
  private config: AutomationConfig;
  private scriptGenerator: ScriptGenerator;
  private autoReplyEngine: AutoReplyEngine;
  private lastScriptTime: number = 0;

  constructor(
    context: SessionContext = DEFAULT_SESSION_CONTEXT,
    config: AutomationConfig = DEFAULT_AUTOMATION_CONFIG
  ) {
    this.config = config;
    this.scriptGenerator = new ScriptGenerator(context);
    this.autoReplyEngine = createAutoReplyEngine(context);
  }

  /**
   * 更新上下文
   */
  updateContext(updates: Partial<SessionContext>): void {
    this.scriptGenerator.updateContext(updates);
    this.autoReplyEngine.updateContext(updates);
  }

  /**
   * 根据注意力和意图生成动作
   */
  generateActions(attentionState: AttentionState, intent: Intent): Action[] {
    const actions: Action[] = [];

    // 1. 话术生成
    if (this.config.enableScriptGeneration) {
      const scriptAction = this.generateScriptAction(attentionState, intent);
      if (scriptAction) {
        actions.push(scriptAction);
      }
    }

    // 2. 场景切换（已存在）
    // 由 Runtime Engine 的决策规则处理

    // 3. 贴片显示（已存在）
    // 由 Runtime Engine 的决策规则处理

    return actions;
  }

  /**
   * 生成话术动作
   */
  private generateScriptAction(attentionState: AttentionState, intent: Intent): Action | null {
    const now = Date.now();

    // 检查间隔
    if (now - this.lastScriptTime < this.config.scriptGenerationInterval) {
      return null;
    }

    // 生成话术
    const script = this.scriptGenerator.recommendScript(attentionState, intent);

    if (!script || script.confidence < 0.7) {
      return null;
    }

    this.lastScriptTime = now;

    console.log(`[Automation] 生成话术: ${script.script}`);

    return {
      type: 'auto_reply',
      text: script.script,
      voice: this.config.enableVoiceSynthesis,
    };
  }

  /**
   * 处理评论
   */
  handleComment(comment: Comment): Reply | null {
    if (!this.config.enableAutoReply) {
      return null;
    }

    const reply = this.autoReplyEngine.generateReply(comment);

    if (reply) {
      console.log(`[Automation] 自动回复: ${reply.reply}`);
    }

    return reply;
  }

  /**
   * 批量处理评论
   */
  handleComments(comments: Comment[]): Reply[] {
    if (!this.config.enableAutoReply) {
      return [];
    }

    return this.autoReplyEngine.batchReply(comments);
  }

  /**
   * 获取话术历史
   */
  getScriptHistory() {
    return this.scriptGenerator.getHistory();
  }

  /**
   * 获取回复历史
   */
  getReplyHistory() {
    return this.autoReplyEngine.getHistory();
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      scripts: {
        total: this.scriptGenerator.getHistory().length,
        latest: this.scriptGenerator.getLatestScript(),
      },
      replies: this.autoReplyEngine.getStatistics(),
    };
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.scriptGenerator.clearHistory();
    this.autoReplyEngine.clearHistory();
  }
}

/**
 * 创建默认自动化管理器实例
 */
export function createAutomationManager(
  context?: SessionContext,
  config?: AutomationConfig
): AutomationManager {
  return new AutomationManager(context, config);
}
