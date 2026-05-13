/**
 * Livestream OS - 主程序入口
 * 
 * 系统架构：
 * Event → Attention Bus → Intent Parser → Runtime → SceneGraph → Renderer → Metrics
 */

import { ConfigManager, configManager } from './config';
import { OBSAdapter } from './render-adapter/obs-adapter';
import { MockRenderer } from './render-adapter/mock-renderer';
import { AttentionBus } from './attention-bus';
import { IntentParser } from './intent-parser';
import { RuntimeEngine } from './runtime';
import { SceneGraphBuilder } from './scene-graph';
import { FakeEventGenerator } from './generators/fake-event-generator';
import { DouyinAdapter } from './data-adapter/douyin-adapter';
import { ErrorHandlingSystem, errorHandlingSystem } from './error-handling';
import { MonitoringSystem, monitoringSystem } from './monitoring';
import { Optimizer } from './optimizer';
import { KnowledgeGraph } from './knowledge-graph';
import { LiveEvent, AttentionState, Intent } from './types';

/**
 * Livestream OS 主类
 */
export class LivestreamOS {
  private config: ConfigManager;
  
  // 核心模块
  private obsAdapter!: OBSAdapter;
  private mockRenderer!: MockRenderer;
  private attentionBus!: AttentionBus;
  private intentParser!: IntentParser;
  private runtime!: RuntimeEngine;
  private sceneGraph!: SceneGraphBuilder;
  private fakeEventGenerator?: FakeEventGenerator;
  private douyinAdapter?: DouyinAdapter;
  
  // 优化模块
  private optimizer!: Optimizer;
  private knowledgeGraph!: KnowledgeGraph;
  
  // 系统模块
  private errorHandling!: ErrorHandlingSystem;
  private monitoring!: MonitoringSystem;
  
  // 状态
  private isRunning: boolean = false;
  private useFakeData: boolean;
  private eventBuffer: LiveEvent[] = [];

  constructor(customConfig?: Partial<any>) {
    // 初始化配置
    this.config = customConfig ? new ConfigManager(customConfig) : configManager;
    
    // 验证配置
    const validation = this.config.validate();
    if (!validation.valid) {
      console.error('配置验证失败:', validation.errors);
      throw new Error('Invalid configuration');
    }
    
    this.useFakeData = this.config.getDouyinConfig().useFakeData;
    
    // 打印配置
    this.config.print();
    
    // 初始化模块
    this.initializeModules();
  }

  /**
   * 初始化所有模块
   */
  private initializeModules(): void {
    console.log('[LivestreamOS] 初始化模块...');

    // 渲染器
    this.obsAdapter = new OBSAdapter(this.config.getOBSConfig());
    this.mockRenderer = new MockRenderer();
    
    // 核心引擎
    this.attentionBus = new AttentionBus();
    this.intentParser = new IntentParser();
    this.runtime = new RuntimeEngine();
    this.sceneGraph = new SceneGraphBuilder();
    
    // 如果使用模拟数据，初始化事件生成器
    if (this.useFakeData) {
      this.fakeEventGenerator = new FakeEventGenerator('mixed');
    } else {
      // 初始化抖音数据适配器
      const douyinConfig = this.config.getDouyinConfig();
      this.douyinAdapter = new DouyinAdapter({
        appKey: douyinConfig.apiKey || '',
        appSecret: douyinConfig.apiSecret || '',
        callbackPort: parseInt(process.env.DOUYIN_CALLBACK_PORT || '3000'),
        callbackPath: process.env.DOUYIN_CALLBACK_PATH || '/live_data_callback',
      });
    }
    
    // 优化模块
    this.knowledgeGraph = new KnowledgeGraph();
    this.optimizer = new Optimizer();
    
    // 系统模块
    this.errorHandling = errorHandlingSystem;
    this.monitoring = monitoringSystem;
    
    console.log('[LivestreamOS] 模块初始化完成');
  }

  /**
   * 启动系统
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[LivestreamOS] 系统已在运行');
      return;
    }

    console.log('\n========================================');
    console.log('Livestream OS 启动中...');
    console.log('========================================\n');

    try {
      // 1. 初始化错误处理系统
      console.log('[1/6] 初始化错误处理系统...');
      await this.errorHandling.initialize({
        obsAdapter: this.obsAdapter,
        attentionBus: this.attentionBus,
      });

      // 2. 初始化监控系统
      console.log('[2/6] 初始化监控系统...');
      await this.monitoring.initialize();

      // 3. 连接 OBS
      console.log('[3/6] 连接 OBS...');
      const obsStatus = await this.obsAdapter.connect();
      if (!obsStatus.connected) {
        console.warn('[LivestreamOS] OBS 连接失败，使用 Mock 渲染器');
      } else {
        console.log('[LivestreamOS] OBS 连接成功');
      }

      // 4. 启动数据流
      console.log('[4/6] 启动数据流...');
      await this.startDataStream();

      // 5. 启动事件处理循环
      console.log('[5/6] 启动事件处理循环...');
      this.startEventLoop();

      // 6. 启动优化循环
      console.log('[6/6] 启动优化循环...');
      this.startOptimizationLoop();

      this.isRunning = true;

      console.log('\n========================================');
      console.log('Livestream OS 启动完成 ✓');
      console.log('========================================');
      console.log(`\n监控仪表板: http://localhost:${this.config.getMonitoringConfig().dashboardPort}`);
      console.log(`数据模式: ${this.useFakeData ? '模拟数据' : '真实数据'}`);
      
      if (!this.useFakeData && this.douyinAdapter) {
        const status = this.douyinAdapter.getStatus();
        console.log(`抖音回调地址: http://localhost:${status.port}${status.callbackPath}`);
      }
      
      console.log('\n按 Ctrl+C 停止系统\n');

    } catch (error) {
      console.error('[LivestreamOS] 启动失败:', error);
      await this.shutdown();
      throw error;
    }
  }

  /**
   * 启动数据流
   */
  private async startDataStream(): Promise<void> {
    if (this.useFakeData && this.fakeEventGenerator) {
      // 使用模拟数据
      console.log('[LivestreamOS] 使用模拟数据模式');
      
      this.fakeEventGenerator.on('event', (event: LiveEvent) => {
        this.attentionBus.push(event);
        this.eventBuffer.push(event);
        this.monitoring.recordEventLatency(0);
      });
      
      // 开始生成事件
      this.fakeEventGenerator.startContinuous({
        scenario: 'mixed',
        intervalMs: 2000,
      });
      
    } else if (this.douyinAdapter) {
      // 使用真实抖音数据
      console.log('[LivestreamOS] 使用真实抖音数据模式');
      
      // 启动抖音数据适配器
      await this.douyinAdapter.start();
      
      // 监听抖音事件
      this.douyinAdapter.on('event', (event: LiveEvent) => {
        this.attentionBus.push(event);
        this.eventBuffer.push(event);
        this.monitoring.recordEventLatency(0);
      });
      
      console.log('[LivestreamOS] 抖音数据适配器已启动');
      console.log('[LivestreamOS] 请在抖音开放平台配置回调地址');
    } else {
      console.warn('[LivestreamOS] 未配置数据源，请检查配置');
    }
  }

  /**
   * 启动事件处理循环
   */
  private startEventLoop(): void {
    // 订阅注意力状态更新
    this.attentionBus.subscribe((state: AttentionState) => {
      try {
        // 更新监控指标
        this.monitoring.updateAttentionMetrics(
          state.density,
          0, // activeUsers
          0, // engagementRate
          0  // conversionRate
        );

        // 获取最近的评论
        const recentComments = this.eventBuffer
          .filter(e => e.eventType === 'comment')
          .slice(-5)
          .map(e => (e as any).content);

        // 如果有评论，解析意图
        if (recentComments.length > 0) {
          const lastComment = recentComments[recentComments.length - 1];
          
          // 创建评论事件
          const commentEvent = {
            eventId: `comment-${Date.now()}`,
            eventType: 'comment' as const,
            timestamp: Date.now(),
            sessionId: 'session-001',
            userId: 'user-001',
            userName: 'User',
            content: lastComment,
          };
          
          const intent = this.intentParser.parse(commentEvent, state, 0);

          // 运行时决策
          const startTime = Date.now();
          const decision = this.runtime.decide(intent, state);
          const decisionLatency = Date.now() - startTime;

          this.monitoring.recordDecisionLatency(decisionLatency, true);

          // 执行动作
          if (decision && decision.actions.length > 0) {
            this.executeActions(decision.actions);
          }
        }
      } catch (error) {
        console.error('[LivestreamOS] 事件处理错误:', error);
        this.errorHandling.handleError(error as Error, {
          component: 'event-loop',
          operation: 'process-attention-update',
        });
        this.monitoring.recordError();
      }
    });

    console.log('[LivestreamOS] 事件处理循环已启动');
  }

  /**
   * 启动优化循环
   */
  private startOptimizationLoop(): void {
    // 每 60 秒运行一次优化
    setInterval(() => {
      try {
        const attentionState = this.attentionBus.getState();
        const metrics = this.monitoring.getCurrentSnapshot();

        console.log('[Optimizer] Running optimization cycle...');
        
        // TODO: 调用优化器
        // const proposals = await this.optimizer.propose(attentionState, metrics.business);
        
      } catch (error) {
        console.error('[LivestreamOS] 优化循环错误:', error);
      }
    }, 60000);

    console.log('[LivestreamOS] 优化循环已启动 (60s 间隔)');
  }

  /**
   * 执行动作
   */
  private async executeActions(actions: any[]): Promise<void> {
    for (const action of actions) {
      try {
        const startTime = Date.now();
        
        // 优先使用 OBS，如果未连接则使用 Mock
        const renderer = this.obsAdapter.isConnected() ? this.obsAdapter : this.mockRenderer;
        const result = await renderer.execute(action);
        
        const latency = Date.now() - startTime;
        this.monitoring.recordSceneSwitch(latency, result.success);

        if (result.success) {
          console.log(`[Action] ${action.type} ✓`, action);
        } else {
          console.warn(`[Action] ${action.type} ✗:`, result.message);
        }
      } catch (error) {
        console.error(`[Action] ${action.type} 执行失败:`, error);
        this.monitoring.recordError();
      }
    }
  }

  /**
   * 停止系统
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n========================================');
    console.log('Livestream OS 关闭中...');
    console.log('========================================\n');

    this.isRunning = false;

    // 停止事件生成
    if (this.fakeEventGenerator) {
      this.fakeEventGenerator.stop();
    }

    // 停止抖音适配器
    if (this.douyinAdapter) {
      await this.douyinAdapter.stop();
    }

    // 断开 OBS
    await this.obsAdapter.disconnect();

    // 关闭监控系统
    await this.monitoring.shutdown();

    // 关闭错误处理系统
    this.errorHandling.shutdown();

    console.log('[LivestreamOS] 系统已关闭');
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    isRunning: boolean;
    obsConnected: boolean;
    useFakeData: boolean;
    currentAttention: number;
    activeAlerts: number;
  } {
    const attentionState = this.attentionBus.getState();
    const alerts = this.monitoring.getActiveAlerts();

    return {
      isRunning: this.isRunning,
      obsConnected: this.obsAdapter.isConnected(),
      useFakeData: this.useFakeData,
      currentAttention: attentionState?.density || 0,
      activeAlerts: alerts.length,
    };
  }
}

// ============================================
// 主程序入口
// ============================================

async function main() {
  // 创建系统实例
  const system = new LivestreamOS();

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号');
    await system.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号');
    await system.shutdown();
    process.exit(0);
  });

  // 启动系统
  try {
    await system.start();
  } catch (error) {
    console.error('系统启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export default LivestreamOS;
