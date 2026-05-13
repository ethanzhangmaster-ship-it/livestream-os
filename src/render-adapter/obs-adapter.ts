/**
 * OBS WebSocket Adapter
 * 核心职责：连接 OBS，执行渲染动作
 * 设计原则：OBS 是 GPU，智能在 Runtime Layer
 */

import OBSWebSocket from 'obs-websocket-js';
import { Action, Violation } from '../types';
import { getMappedSceneName } from '../config/scene-mapping';

export interface OBSAdapterConfig {
  host: string;
  port: number;
  password: string;
  autoReconnect: boolean;
  reconnectInterval: number; // ms
}

const DEFAULT_CONFIG: OBSAdapterConfig = {
  host: 'localhost',
  port: 4455,
  password: '',
  autoReconnect: true,
  reconnectInterval: 5000,
};

export interface OBSConnectionStatus {
  connected: boolean;
  error?: string;
  obsVersion?: string;
  obsWebSocketVersion?: string;
}

/**
 * OBS Adapter 类
 */
export class OBSAdapter {
  private obs: OBSWebSocket;
  private config: OBSAdapterConfig;
  private connected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: Partial<OBSAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.obs = new OBSWebSocket();
    this.setupEventHandlers();
  }

  /**
   * 连接到 OBS
   */
  async connect(): Promise<OBSConnectionStatus> {
    try {
      const result = await this.obs.connect(
        `ws://${this.config.host}:${this.config.port}`,
        this.config.password
      );

      this.connected = true;
      console.log(`[OBSAdapter] 已连接到 OBS (WebSocket ${result.obsWebSocketVersion})`);

      return {
        connected: true,
        obsWebSocketVersion: result.obsWebSocketVersion,
      };
    } catch (error: any) {
      console.error(`[OBSAdapter] 连接失败:`, error.message);
      
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }

      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    await this.obs.disconnect();
    this.connected = false;
    console.log('[OBSAdapter] 已断开连接');
  }

  /**
   * 执行动作
   */
  async execute(action: Action): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      switch (action.type) {
        case 'scene_switch':
          return await this.handleSceneSwitch(action);

        case 'overlay_show':
          return await this.handleOverlayShow(action);

        case 'overlay_hide':
          return await this.handleOverlayHide(action);

        case 'text_update':
          return await this.handleTextUpdate(action);

        case 'auto_reply':
          // Auto reply 不需要 OBS 操作
          return { success: true, message: `自动回复: "${action.text}"` };

        case 'product_highlight':
          // Product highlight 可能需要显示特定源
          return await this.handleProductHighlight(action);

        case 'start_recording':
          return await this.startRecording();

        case 'stop_recording':
          return await this.stopRecording();

        case 'start_streaming':
          return await this.startStreaming();

        case 'stop_streaming':
          return await this.stopStreaming();

        default:
          return { success: false, message: `未知动作类型` };
      }
    } catch (error: any) {
      console.error(`[OBSAdapter] 执行动作失败:`, error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 批量执行动作
   */
  async executeBatch(actions: Action[]): Promise<{ success: boolean; message?: string }[]> {
    const results = [];

    for (const action of actions) {
      const result = await this.execute(action);
      results.push(result);

      // 如果失败，停止执行后续动作
      if (!result.success) {
        console.error(`[OBSAdapter] 动作执行失败，停止后续动作`);
        break;
      }
    }

    return results;
  }

  /**
   * 获取当前场景
   */
  async getCurrentScene(): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const response = await this.obs.call('GetCurrentProgramScene');
      return response.currentProgramSceneName;
    } catch (error) {
      console.error(`[OBSAdapter] 获取当前场景失败:`, error);
      return null;
    }
  }

  /**
   * 获取场景列表
   */
  async getSceneList(): Promise<string[]> {
    if (!this.connected) return [];

    try {
      const response = await this.obs.call('GetSceneList');
      return response.scenes.map((scene: any) => scene.sceneName);
    } catch (error) {
      console.error(`[OBSAdapter] 获取场景列表失败:`, error);
      return [];
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // Recording & Streaming Control
  // ============================================

  /**
   * 开始录制
   */
  async startRecording(): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      // 检查是否已经在录制
      const status = await this.obs.call('GetRecordStatus');
      if (status.outputActive) {
        return { success: false, message: '已经在录制中' };
      }

      await this.obs.call('StartRecord');
      console.log('[OBSAdapter] 开始录制');
      return { success: true, message: '开始录制' };
    } catch (error: any) {
      console.error('[OBSAdapter] 开始录制失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 停止录制
   */
  async stopRecording(): Promise<{ success: boolean; message?: string; filePath?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      // 检查是否正在录制
      const status = await this.obs.call('GetRecordStatus');
      if (!status.outputActive) {
        return { success: false, message: '当前未在录制' };
      }

      const result = await this.obs.call('StopRecord');
      console.log('[OBSAdapter] 停止录制');
      return { success: true, message: '停止录制', filePath: (result as any).outputPath };
    } catch (error: any) {
      console.error('[OBSAdapter] 停止录制失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取录制状态
   */
  async getRecordingStatus(): Promise<{
    isRecording: boolean;
    duration?: number;
    filePath?: string;
  }> {
    if (!this.connected) {
      return { isRecording: false };
    }

    try {
      const status = await this.obs.call('GetRecordStatus') as any;
      return {
        isRecording: status.outputActive,
        duration: status.outputDuration,
        filePath: status.outputPath,
      };
    } catch (error) {
      console.error('[OBSAdapter] 获取录制状态失败:', error);
      return { isRecording: false };
    }
  }

  /**
   * 开始推流
   */
  async startStreaming(): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      // 检查是否已经在推流
      const status = await this.obs.call('GetStreamStatus');
      if (status.outputActive) {
        return { success: false, message: '已经在推流中' };
      }

      await this.obs.call('StartStream');
      console.log('[OBSAdapter] 开始推流');
      return { success: true, message: '开始推流' };
    } catch (error: any) {
      console.error('[OBSAdapter] 开始推流失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 停止推流
   */
  async stopStreaming(): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      // 检查是否正在推流
      const status = await this.obs.call('GetStreamStatus');
      if (!status.outputActive) {
        return { success: false, message: '当前未在推流' };
      }

      await this.obs.call('StopStream');
      console.log('[OBSAdapter] 停止推流');
      return { success: true, message: '停止推流' };
    } catch (error: any) {
      console.error('[OBSAdapter] 停止推流失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取推流状态
   */
  async getStreamingStatus(): Promise<{
    isStreaming: boolean;
    duration?: number;
    bytesPerSec?: number;
  }> {
    if (!this.connected) {
      return { isStreaming: false };
    }

    try {
      const status = await this.obs.call('GetStreamStatus');
      return {
        isStreaming: status.outputActive,
        duration: status.outputDuration,
        bytesPerSec: (status as any).outputBytesPerSec,
      };
    } catch (error) {
      console.error('[OBSAdapter] 获取推流状态失败:', error);
      return { isStreaming: false };
    }
  }

  /**
   * 切换录制状态
   */
  async toggleRecording(): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      const status = await this.obs.call('GetRecordStatus');
      if (status.outputActive) {
        return await this.stopRecording();
      } else {
        return await this.startRecording();
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 切换推流状态
   */
  async toggleStreaming(): Promise<{ success: boolean; message?: string }> {
    if (!this.connected) {
      return { success: false, message: 'OBS 未连接' };
    }

    try {
      const status = await this.obs.call('GetStreamStatus');
      if (status.outputActive) {
        return await this.stopStreaming();
      } else {
        return await this.startStreaming();
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.obs.on('ConnectionClosed', () => {
      console.log('[OBSAdapter] 连接已关闭');
      this.connected = false;

      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.obs.on('ConnectionError', (error: any) => {
      console.error('[OBSAdapter] 连接错误:', error);
      this.connected = false;
    });

    this.obs.on('Identified', () => {
      console.log('[OBSAdapter] 已识别');
      this.connected = true;
    });
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      console.log('[OBSAdapter] 尝试重新连接...');
      await this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 处理场景切换
   */
  private async handleSceneSwitch(action: {
    type: 'scene_switch';
    target: string;
    transition?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 检查场景是否存在
      const scenes = await this.getSceneList();
      if (!scenes.includes(action.target)) {
        return { success: false, message: `场景 "${action.target}" 不存在` };
      }

      // 切换场景
      await this.obs.call('SetCurrentProgramScene', {
        sceneName: action.target,
      });

      console.log(`[OBSAdapter] 场景切换: ${action.target}`);
      return { success: true, message: `场景切换: ${action.target}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 处理显示贴片
   */
  private async handleOverlayShow(action: {
    type: 'overlay_show';
    target: string;
    duration?: number;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 获取当前场景
      const currentScene = await this.getCurrentScene();
      if (!currentScene) {
        return { success: false, message: '无法获取当前场景' };
      }

      // 获取场景中的源
      const sceneItemResponse = await this.obs.call('GetSceneItemId', {
        sceneName: currentScene,
        sourceName: action.target,
      });

      const sceneItemId = sceneItemResponse.sceneItemId;

      // 显示源
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: sceneItemId,
        sceneItemEnabled: true,
      });

      console.log(`[OBSAdapter] 显示贴片: ${action.target}`);

      // 如果有持续时间，设置自动隐藏
      if (action.duration) {
        setTimeout(async () => {
          await this.obs.call('SetSceneItemEnabled', {
            sceneName: currentScene,
            sceneItemId: sceneItemId,
            sceneItemEnabled: false,
          });
          console.log(`[OBSAdapter] 自动隐藏贴片: ${action.target}`);
        }, action.duration);
      }

      return { success: true, message: `显示贴片: ${action.target}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 处理隐藏贴片
   */
  private async handleOverlayHide(action: {
    type: 'overlay_hide';
    target: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 获取当前场景
      const currentScene = await this.getCurrentScene();
      if (!currentScene) {
        return { success: false, message: '无法获取当前场景' };
      }

      // 获取场景中的源
      const sceneItemResponse = await this.obs.call('GetSceneItemId', {
        sceneName: currentScene,
        sourceName: action.target,
      });

      const sceneItemId = sceneItemResponse.sceneItemId;

      // 隐藏源
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: sceneItemId,
        sceneItemEnabled: false,
      });

      console.log(`[OBSAdapter] 隐藏贴片: ${action.target}`);
      return { success: true, message: `隐藏贴片: ${action.target}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 处理文字更新
   */
  private async handleTextUpdate(action: {
    type: 'text_update';
    element: string;
    content: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 更新文字源内容
      await this.obs.call('SetInputSettings', {
        inputName: action.element,
        inputSettings: {
          text: action.content,
        },
      });

      console.log(`[OBSAdapter] 更新文字 ${action.element}: "${action.content}"`);
      return { success: true, message: `更新文字: ${action.content}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 处理产品高亮
   */
  private async handleProductHighlight(action: {
    type: 'product_highlight';
    sku: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 产品高亮通常需要显示特定的产品卡片或贴片
      // 这里假设产品 SKU 对应一个源名称
      const sourceName = `product_${action.sku}`;

      // 获取当前场景
      const currentScene = await this.getCurrentScene();
      if (!currentScene) {
        return { success: false, message: '无法获取当前场景' };
      }

      // 尝试显示产品源
      try {
        const sceneItemResponse = await this.obs.call('GetSceneItemId', {
          sceneName: currentScene,
          sourceName: sourceName,
        });

        await this.obs.call('SetSceneItemEnabled', {
          sceneName: currentScene,
          sceneItemId: sceneItemResponse.sceneItemId,
          sceneItemEnabled: true,
        });

        console.log(`[OBSAdapter] 高亮产品: ${action.sku}`);
        return { success: true, message: `高亮产品: ${action.sku}` };
      } catch {
        // 如果源不存在，返回成功但不执行操作
        console.log(`[OBSAdapter] 产品源 "${sourceName}" 不存在，跳过`);
        return { success: true, message: `产品高亮: ${action.sku} (源不存在)` };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * 导出便捷函数
 */
export function createOBSAdapter(config?: Partial<OBSAdapterConfig>): OBSAdapter {
  return new OBSAdapter(config);
}
