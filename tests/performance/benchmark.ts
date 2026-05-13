/**
 * 性能基准测试
 * 测试各模块的基本性能指标
 */

import { AttentionBus } from '../../src/attention-bus';
import { IntentParser } from '../../src/intent-parser';
import { RuntimeEngine } from '../../src/runtime';
import { SceneGraphBuilder } from '../../src/scene-graph';
import { MockRenderer } from '../../src/render-adapter/mock-renderer';
import { LiveEvent } from '../../src/types';
import { createCommentEvent } from '../helpers/event-factory';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

class PerformanceBenchmark {
  private attentionBus: AttentionBus;
  private intentParser: IntentParser;
  private runtime: RuntimeEngine;
  private sceneGraph: SceneGraphBuilder;
  private renderer: MockRenderer;

  constructor() {
    this.attentionBus = new AttentionBus();
    this.intentParser = new IntentParser();
    this.runtime = new RuntimeEngine();
    this.sceneGraph = new SceneGraphBuilder();
    this.renderer = new MockRenderer();
  }

  /**
   * 运行所有基准测试
   */
  async runAll(): Promise<void> {
    console.log('========================================');
    console.log('  性能基准测试');
    console.log('========================================\n');

    // 1. 事件处理基准
    const eventBenchmark = await this.benchmarkEventProcessing();
    this.printResult(eventBenchmark);

    // 2. 意图解析基准
    const intentBenchmark = await this.benchmarkIntentParsing();
    this.printResult(intentBenchmark);

    // 3. 决策基准
    const decisionBenchmark = await this.benchmarkDecisionMaking();
    this.printResult(decisionBenchmark);

    // 4. 场景切换基准
    const sceneBenchmark = await this.benchmarkSceneSwitch();
    this.printResult(sceneBenchmark);

    // 5. 端到端基准
    const e2eBenchmark = await this.benchmarkEndToEnd();
    this.printResult(e2eBenchmark);

    console.log('\n========================================');
    console.log('  基准测试完成');
    console.log('========================================\n');
  }

  /**
   * 事件处理基准测试
   */
  private async benchmarkEventProcessing(): Promise<BenchmarkResult> {
    const iterations = 10000;
    const times: number[] = [];

    // 生成测试事件
    const events: LiveEvent[] = [];
    for (let i = 0; i < iterations; i++) {
      events.push(createCommentEvent(`测试评论 ${i}`));
    }

    // 预热
    for (let i = 0; i < 100; i++) {
      this.attentionBus.push(events[i]);
    }

    // 测试
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const eventStart = performance.now();
      this.attentionBus.push(events[i]);
      const eventEnd = performance.now();
      times.push(eventEnd - eventStart);
    }
    const endTime = Date.now();

    return this.calculateResult('事件处理', iterations, startTime, endTime, times);
  }

  /**
   * 意图解析基准测试
   */
  private async benchmarkIntentParsing(): Promise<BenchmarkResult> {
    const iterations = 5000;
    const times: number[] = [];

    const testComments = [
      '这个猫粮挑食能吃吗？',
      '多少钱一包？',
      '有优惠活动吗？',
      '适口性怎么样？',
      '买回去不吃能退吗？',
    ];

    const state = this.attentionBus.getState();

    // 预热
    for (let i = 0; i < 100; i++) {
      const comment = createCommentEvent(testComments[i % testComments.length]);
      this.intentParser.parse(comment, state, 0);
    }

    // 测试
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const comment = createCommentEvent(testComments[i % testComments.length]);
      const parseStart = performance.now();
      this.intentParser.parse(comment, state, 0);
      const parseEnd = performance.now();
      times.push(parseEnd - parseStart);
    }
    const endTime = Date.now();

    return this.calculateResult('意图解析', iterations, startTime, endTime, times);
  }

  /**
   * 决策基准测试
   */
  private async benchmarkDecisionMaking(): Promise<BenchmarkResult> {
    const iterations = 5000;
    const times: number[] = [];

    const state = this.attentionBus.getState();
    const comment = createCommentEvent('这个猫粮挑食能吃吗？');
    const intent = this.intentParser.parse(comment, state, 0);

    // 预热
    for (let i = 0; i < 100; i++) {
      this.runtime.decide(intent, state);
    }

    // 测试
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const decideStart = performance.now();
      this.runtime.decide(intent, state);
      const decideEnd = performance.now();
      times.push(decideEnd - decideStart);
    }
    const endTime = Date.now();

    return this.calculateResult('决策制定', iterations, startTime, endTime, times);
  }

  /**
   * 场景切换基准测试
   */
  private async benchmarkSceneSwitch(): Promise<BenchmarkResult> {
    const iterations = 1000;
    const times: number[] = [];

    const action = { type: 'scene_switch' as const, target: 'product_display' };

    // 预热
    for (let i = 0; i < 50; i++) {
      await this.renderer.execute(action);
    }

    // 测试
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const execStart = performance.now();
      await this.renderer.execute(action);
      const execEnd = performance.now();
      times.push(execEnd - execStart);
    }
    const endTime = Date.now();

    return this.calculateResult('场景切换', iterations, startTime, endTime, times);
  }

  /**
   * 端到端基准测试
   */
  private async benchmarkEndToEnd(): Promise<BenchmarkResult> {
    const iterations = 1000;
    const times: number[] = [];

    const testComments = [
      '这个猫粮挑食能吃吗？',
      '多少钱一包？',
      '有优惠活动吗？',
    ];

    // 预热
    for (let i = 0; i < 50; i++) {
      const event = createCommentEvent(testComments[i % testComments.length]);
      this.attentionBus.push(event);
      const state = this.attentionBus.getState();
      const intent = this.intentParser.parse(event, state, 0);
      const decision = this.runtime.decide(intent, state);
      if (decision.actions.length > 0) {
        await this.renderer.execute(decision.actions[0]);
      }
    }

    // 测试
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();

      const event = createCommentEvent(testComments[i % testComments.length]);
      this.attentionBus.push(event);
      const state = this.attentionBus.getState();
      const intent = this.intentParser.parse(event, state, 0);
      const decision = this.runtime.decide(intent, state);
      if (decision.actions.length > 0) {
        await this.renderer.execute(decision.actions[0]);
      }

      const iterEnd = performance.now();
      times.push(iterEnd - iterStart);
    }
    const endTime = Date.now();

    return this.calculateResult('端到端', iterations, startTime, endTime, times);
  }

  /**
   * 计算结果
   */
  private calculateResult(
    name: string,
    iterations: number,
    startTime: number,
    endTime: number,
    times: number[]
  ): BenchmarkResult {
    const totalTime = endTime - startTime;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = (iterations / totalTime) * 1000;

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond,
    };
  }

  /**
   * 打印结果
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`\n${result.name}:`);
    console.log(`  迭代次数: ${result.iterations}`);
    console.log(`  总耗时: ${result.totalTime}ms`);
    console.log(`  平均耗时: ${result.avgTime.toFixed(3)}ms`);
    console.log(`  最小耗时: ${result.minTime.toFixed(3)}ms`);
    console.log(`  最大耗时: ${result.maxTime.toFixed(3)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s`);
  }
}

// 运行基准测试
async function main() {
  const benchmark = new PerformanceBenchmark();
  await benchmark.runAll();
}

main().catch(console.error);
