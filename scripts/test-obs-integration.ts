/**
 * OBS 完整集成测试
 * 测试完整链路：Event → Attention Bus → Intent Parser → Runtime → SceneGraph → OBS
 */

import { FakeEventGenerator } from '../src/generators/fake-event-generator';
import { AttentionBus } from '../src/attention-bus';
import { IntentParser } from '../src/intent-parser';
import { RuntimeEngine } from '../src/runtime';
import { SceneGraphBuilder } from '../src/scene-graph';
import { OBSAdapter } from '../src/render-adapter/obs-adapter';
import { CommentEvent } from '../src/types';

async function testFullIntegration() {
  console.log('========================================');
  console.log('OBS 完整集成测试');
  console.log('========================================\n');

  // 初始化 OBS Adapter
  console.log('1. 连接 OBS...');
  const obs = new OBSAdapter({
    host: 'localhost',
    port: 4455,
    password: '',
  });

  const status = await obs.connect();
  if (!status.connected) {
    console.error('❌ OBS 连接失败:', status.error);
    console.log('\n请确保 OBS Studio 已启动并启用 WebSocket 服务器');
    process.exit(1);
  }

  console.log(`✓ 已连接到 OBS ${status.obsVersion}\n`);

  // 初始化其他组件
  console.log('2. 初始化系统组件...');
  const generator = new FakeEventGenerator('purchase_hesitation');
  const attentionBus = new AttentionBus();
  const intentParser = new IntentParser();
  const runtime = new RuntimeEngine();
  const sceneGraph = new SceneGraphBuilder();
  console.log('✓ 组件初始化完成\n');

  // 生成事件
  console.log('3. 生成测试事件...');
  const events = generator.generateEvents();
  console.log(`✓ 生成 ${events.length} 个事件\n`);

  // 处理事件
  console.log('4. 处理事件流...\n');
  console.log('----------------------------------------');

  for (const event of events) {
    // 推送事件到 Attention Bus
    attentionBus.push(event);
    const attentionState = attentionBus.getState();

    // 如果是评论事件，处理完整链路
    if (event.eventType === 'comment') {
      const commentEvent = event as CommentEvent;
      console.log(`\n[评论] ${commentEvent.userName}: "${commentEvent.content}"`);
      console.log(`  注意力密度: ${(attentionState.density * 100).toFixed(1)}%`);
      console.log(`  注意力模式: ${attentionState.pattern}`);

      // 解析意图
      const sessionDuration = runtime.getSessionDuration();
      const intent = intentParser.parse(commentEvent, attentionState, sessionDuration);
      console.log(`  意图类型: ${intent.type} (置信度: ${(intent.confidence * 100).toFixed(0)}%)`);

      // Runtime 做出决策
      const decision = runtime.decide(intent, attentionState);
      console.log(`  决策: ${decision.reasoning}`);
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

      if (hasHardViolation) {
        console.log('  ⚠ 跳过执行 (硬违规)');
        continue;
      }

      // 执行动作
      if (decision.actions.length > 0) {
        console.log('  执行动作:');
        for (const action of decision.actions) {
          const result = await obs.execute(action);
          if (result.success) {
            console.log(`    ✓ ${result.message}`);
          } else {
            console.log(`    ❌ ${result.message}`);
          }

          // 动作之间间隔 500ms
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  console.log('\n----------------------------------------\n');

  // 等待用户观察 OBS 变化
  console.log('5. 等待 5 秒，观察 OBS 场景变化...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 断开连接
  console.log('6. 断开连接...');
  await obs.disconnect();
  console.log('✓ 已断开连接\n');

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================\n');

  console.log('提示:');
  console.log('  - 如果 OBS 中没有对应的场景，场景切换会失败');
  console.log('  - 如果场景中没有对应的源，贴片显示会失败');
  console.log('  - 请在 OBS 中创建以下场景:');
  console.log('    * hook (开场)');
  console.log('    * palatability_demo (适口性演示)');
  console.log('    * price_promotion (价格促销)');
  console.log('    * checkout_guide (下单引导)');
  console.log('  - 请在场景中创建以下源:');
  console.log('    * picky_eating_badge (挑食徽章)');
  console.log('    * discount_badge (优惠徽章)');
  console.log('    * buy_button (购买按钮)');
  console.log('    * test_text (测试文字)\n');

  process.exit(0);
}

// 运行测试
testFullIntegration().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
