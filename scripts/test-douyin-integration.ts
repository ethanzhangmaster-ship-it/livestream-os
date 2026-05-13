/**
 * 抖音数据接入测试
 * 测试完整链路：Douyin Adapter → Event Normalizer → Data Quality Validator → Attention Bus → Runtime → OBS
 */

import { DouyinAdapter } from '../src/adapters/douyin-adapter';
import { EventNormalizer } from '../src/adapters/event-normalizer';
import { DataQualityValidator } from '../src/adapters/data-quality-validator';
import { AttentionBus } from '../src/attention-bus';
import { IntentParser } from '../src/intent-parser';
import { RuntimeEngine } from '../src/runtime';
import { SceneGraphBuilder } from '../src/scene-graph';
import { OBSAdapter } from '../src/render-adapter/obs-adapter';
import { LiveEvent, CommentEvent } from '../src/types';

async function testDouyinIntegration() {
  console.log('========================================');
  console.log('抖音数据接入测试');
  console.log('========================================\n');

  // 初始化组件
  console.log('1. 初始化组件...');
  const douyinAdapter = new DouyinAdapter({
    roomId: 'test_room_001',
    enableFakeData: true,
    fakeDataInterval: 2000, // 2 秒生成一个事件
  });

  const normalizer = new EventNormalizer();
  const validator = new DataQualityValidator();
  const attentionBus = new AttentionBus();
  const intentParser = new IntentParser();
  const runtime = new RuntimeEngine();
  const sceneGraph = new SceneGraphBuilder();

  // 尝试连接 OBS（可选）
  const obs = new OBSAdapter({
    host: 'localhost',
    port: 4455,
    password: '',
  });

  let obsConnected = false;
  try {
    const status = await obs.connect();
    obsConnected = status.connected;
    if (obsConnected) {
      console.log('✓ OBS 已连接\n');
    } else {
      console.log('⚠ OBS 未连接，将使用 Mock 渲染\n');
    }
  } catch (error) {
    console.log('⚠ OBS 连接失败，将使用 Mock 渲染\n');
  }

  // 连接到抖音数据源
  console.log('2. 连接到抖音数据源...');
  const connectResult = await douyinAdapter.connect();
  if (!connectResult.success) {
    console.error('❌ 连接失败:', connectResult.message);
    process.exit(1);
  }
  console.log(`✓ ${connectResult.message}\n`);

  // 订阅事件流
  console.log('3. 订阅事件流...\n');
  console.log('----------------------------------------');

  let eventCount = 0;
  const maxEvents = 20; // 处理 20 个事件后停止

  const subscription = douyinAdapter.getEventStream().subscribe(async (event: LiveEvent) => {
    eventCount++;

    // 验证数据质量
    const validation = validator.validate(event);
    if (!validation.valid) {
      console.log(`[事件 ${eventCount}] ❌ 数据质量验证失败: ${validation.reason}`);
      return;
    }

    // 推送到 Attention Bus
    attentionBus.push(event);
    const attentionState = attentionBus.getState();

    // 打印事件信息
    console.log(`\n[事件 ${eventCount}] ${event.eventType.toUpperCase()}`);
    console.log(`  时间: ${new Date(event.timestamp).toLocaleTimeString()}`);
    console.log(`  质量评分: ${(validation.score! * 100).toFixed(0)}%`);
    console.log(`  注意力密度: ${(attentionState.density * 100).toFixed(1)}%`);
    console.log(`  注意力模式: ${attentionState.pattern}`);

    // 如果是评论事件，处理完整链路
    if (event.eventType === 'comment') {
      const commentEvent = event as CommentEvent;
      console.log(`  用户: ${commentEvent.userName}`);
      console.log(`  内容: "${commentEvent.content}"`);

      // 解析意图
      const sessionDuration = runtime.getSessionDuration();
      const intent = intentParser.parse(commentEvent, attentionState, sessionDuration);
      console.log(`  意图: ${intent.type} (置信度: ${(intent.confidence * 100).toFixed(0)}%)`);

      // Runtime 做出决策
      const decision = runtime.decide(intent, attentionState);
      console.log(`  决策: ${decision.reasoning}`);

      if (decision.actions.length > 0) {
        console.log(`  动作数量: ${decision.actions.length}`);

        // 验证动作
        let hasHardViolation = false;
        for (const action of decision.actions) {
          const violations = sceneGraph.validateAction(action);
          if (violations.some(v => v.severity === 'hard')) {
            console.log(`  ❌ Hard violation: ${violations[0].message}`);
            hasHardViolation = true;
            break;
          }
        }

        // 执行动作
        if (!hasHardViolation) {
          console.log('  执行动作:');
          for (const action of decision.actions) {
            if (obsConnected) {
              const result = await obs.execute(action);
              if (result.success) {
                console.log(`    ✓ ${result.message}`);
              } else {
                console.log(`    ❌ ${result.message}`);
              }
            } else {
              console.log(`    [Mock] ${action.type}: ${JSON.stringify(action)}`);
            }

            // 动作之间间隔 300ms
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    }

    // 达到最大事件数后停止
    if (eventCount >= maxEvents) {
      console.log('\n----------------------------------------\n');
      await stop();
    }
  });

  // 停止函数
  async function stop() {
    subscription.unsubscribe();
    await douyinAdapter.disconnect();

    if (obsConnected) {
      await obs.disconnect();
    }

    // 打印统计信息
    console.log('========================================');
    console.log('测试完成');
    console.log('========================================\n');

    const metrics = validator.getMetrics();
    console.log('数据质量统计:');
    console.log(`  总事件数: ${metrics.totalEvents}`);
    console.log(`  有效事件: ${metrics.validEvents}`);
    console.log(`  无效事件: ${metrics.invalidEvents}`);
    console.log(`  平均质量评分: ${(metrics.avgQualityScore * 100).toFixed(1)}%`);

    if (metrics.errors.length > 0) {
      console.log(`  错误数量: ${metrics.errors.length}`);
    }

    console.log('\n提示:');
    console.log('  - 当前使用模拟数据模式');
    console.log('  - 要接入真实抖音数据，需要实现 WebSocket 连接');
    console.log('  - 参考: https://github.com/NanmiCoder/DouyinLiveWebFetcher\n');

    process.exit(0);
  }

  // 设置超时（30 秒后自动停止）
  setTimeout(async () => {
    console.log('\n超时，停止测试...\n');
    await stop();
  }, 30000);
}

// 运行测试
testDouyinIntegration().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
