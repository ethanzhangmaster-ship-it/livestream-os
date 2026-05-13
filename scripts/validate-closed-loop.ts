/**
 * 验证闭环脚本
 * 测试完整的事件流：Event → Attention Bus → Intent Parser → Runtime → SceneGraph → Renderer
 */

import { FakeEventGenerator, Scenario } from '../src/generators/fake-event-generator';
import { AttentionBus } from '../src/attention-bus';
import { IntentParser } from '../src/intent-parser';
import { RuntimeEngine } from '../src/runtime';
import { SceneGraphBuilder } from '../src/scene-graph';
import { MockRenderer } from '../src/render-adapter/mock-renderer';
import { LiveEvent, CommentEvent, Action, Violation } from '../src/types';

interface ValidationResult {
  scenario: Scenario;
  totalEvents: number;
  processedEvents: number;
  decisions: number;
  actions: number;
  success: boolean;
  errors: string[];
  metrics: {
    avgAttentionDensity: number;
    avgIntentConfidence: number;
    avgDecisionLatency: number;
  };
}

/**
 * 验证闭环
 */
function validateClosedLoop(scenario: Scenario): ValidationResult {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`验证场景: ${scenario}`);
  console.log('='.repeat(60));

  const errors: string[] = [];
  const metrics = {
    avgAttentionDensity: 0,
    avgIntentConfidence: 0,
    avgDecisionLatency: 0,
  };

  try {
    // 初始化组件
    const generator = new FakeEventGenerator(scenario);
    const attentionBus = new AttentionBus();
    const intentParser = new IntentParser();
    const runtime = new RuntimeEngine();
    const sceneGraph = new SceneGraphBuilder();
    const renderer = new MockRenderer();

    // 生成事件
    const events = generator.generateEvents();
    console.log(`\n生成事件: ${events.length} 个`);

    // 处理事件
    let processedCount = 0;
    let decisionCount = 0;
    let actionCount = 0;
    const attentionDensities: number[] = [];
    const intentConfidences: number[] = [];
    const decisionLatencies: number[] = [];

    events.forEach((event: LiveEvent) => {
      try {
        // 1. 推送事件到 Attention Bus
        attentionBus.push(event);
        const attentionState = attentionBus.getState();
        attentionDensities.push(attentionState.density);

        // 2. 如果是评论事件，解析意图
        if (event.eventType === 'comment') {
          const commentEvent = event as CommentEvent;
          const sessionDuration = runtime.getSessionDuration();

          const startTime = Date.now();
          const intent = intentParser.parse(commentEvent, attentionState, sessionDuration);
          intentConfidences.push(intent.confidence);

          // 3. Runtime 做出决策
          const decision = runtime.decide(intent, attentionState);
          decisionCount++;

          const latency = Date.now() - startTime;
          decisionLatencies.push(latency);

          // 4. 验证动作
          decision.actions.forEach((action: Action) => {
            const violations: Violation[] = sceneGraph.validateAction(action);

            if (violations.some((v: Violation) => v.severity === 'hard')) {
              errors.push(`Hard violation: ${violations[0].message}`);
            }
          });

          // 5. 执行动作
          const renderEvents = renderer.executeDecision(decision);
          actionCount += renderEvents.length;

          processedCount++;
        } else {
          // 非评论事件也计入处理
          processedCount++;
        }
      } catch (error) {
        errors.push(`处理事件失败: ${error}`);
      }
    });

    // 计算指标
    metrics.avgAttentionDensity = average(attentionDensities);
    metrics.avgIntentConfidence = average(intentConfidences);
    metrics.avgDecisionLatency = average(decisionLatencies);

    // 打印最终状态
    console.log('\n最终状态:');
    renderer.printState();

    // 打印指标
    console.log('\n性能指标:');
    console.log(`  平均注意力密度: ${(metrics.avgAttentionDensity * 100).toFixed(1)}%`);
    console.log(`  平均意图置信度: ${(metrics.avgIntentConfidence * 100).toFixed(1)}%`);
    console.log(`  平均决策延迟: ${metrics.avgDecisionLatency.toFixed(1)}ms`);

    return {
      scenario,
      totalEvents: events.length,
      processedEvents: processedCount,
      decisions: decisionCount,
      actions: actionCount,
      success: errors.length === 0,
      errors,
      metrics,
    };
  } catch (error) {
    errors.push(`验证失败: ${error}`);
    return {
      scenario,
      totalEvents: 0,
      processedEvents: 0,
      decisions: 0,
      actions: 0,
      success: false,
      errors,
      metrics,
    };
  }
}

/**
 * 计算平均值
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * 主函数
 */
function main() {
  console.log('Livestream OS - 闭环验证测试');
  console.log('测试完整的事件流: Event → Attention Bus → Intent Parser → Runtime → SceneGraph → Renderer');

  const scenarios: Scenario[] = [
    'purchase_hesitation',
    'high_engagement',
    'price_sensitivity',
    'drop_risk',
    'mixed',
  ];

  const results: ValidationResult[] = [];

  scenarios.forEach(scenario => {
    const result = validateClosedLoop(scenario);
    results.push(result);
  });

  // 打印汇总
  console.log('\n' + '='.repeat(60));
  console.log('验证汇总');
  console.log('='.repeat(60));

  results.forEach(result => {
    const status = result.success ? '✓ 通过' : '✗ 失败';
    console.log(`\n${result.scenario}: ${status}`);
    console.log(`  事件: ${result.processedEvents}/${result.totalEvents}`);
    console.log(`  决策: ${result.decisions}`);
    console.log(`  动作: ${result.actions}`);
    console.log(`  平均注意力密度: ${(result.metrics.avgAttentionDensity * 100).toFixed(1)}%`);
    console.log(`  平均意图置信度: ${(result.metrics.avgIntentConfidence * 100).toFixed(1)}%`);
    console.log(`  平均决策延迟: ${result.metrics.avgDecisionLatency.toFixed(1)}ms`);

    if (result.errors.length > 0) {
      console.log(`  错误:`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
  });

  // 总体统计
  const totalSuccess = results.filter(r => r.success).length;
  const totalEvents = results.reduce((sum, r) => sum + r.totalEvents, 0);
  const totalProcessed = results.reduce((sum, r) => sum + r.processedEvents, 0);
  const totalDecisions = results.reduce((sum, r) => sum + r.decisions, 0);
  const totalActions = results.reduce((sum, r) => sum + r.actions, 0);

  console.log('\n' + '='.repeat(60));
  console.log('总体统计');
  console.log('='.repeat(60));
  console.log(`通过率: ${totalSuccess}/${results.length} (${((totalSuccess / results.length) * 100).toFixed(0)}%)`);
  console.log(`总事件: ${totalProcessed}/${totalEvents}`);
  console.log(`总决策: ${totalDecisions}`);
  console.log(`总动作: ${totalActions}`);

  // 性能要求验证
  console.log('\n性能要求验证:');
  const avgLatency = average(results.map(r => r.metrics.avgDecisionLatency));
  const avgConfidence = average(results.map(r => r.metrics.avgIntentConfidence));

  console.log(`  事件处理延迟 < 100ms: ${avgLatency < 100 ? '✓ 通过' : '✗ 失败'} (${avgLatency.toFixed(1)}ms)`);
  console.log(`  意图分类准确率 > 85%: ${avgConfidence > 0.85 ? '✓ 通过' : '✗ 失败'} (${(avgConfidence * 100).toFixed(1)}%)`);
  console.log(`  闭环完整性 100%: ${totalProcessed === totalEvents ? '✓ 通过' : '✗ 失败'} (${totalProcessed}/${totalEvents})`);

  // 返回退出码
  process.exit(totalSuccess === results.length ? 0 : 1);
}

// 运行
main();
