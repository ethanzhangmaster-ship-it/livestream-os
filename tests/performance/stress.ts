/**
 * 压力测试
 * 测试系统在高负载下的表现
 */

import { AttentionBus } from '../../src/attention-bus';
import { IntentParser } from '../../src/intent-parser';
import { RuntimeEngine } from '../../src/runtime';
import { MockRenderer } from '../../src/render-adapter/mock-renderer';
import { createRandomEvent, createCommentEvent } from '../helpers/event-factory';

interface StressTestResult {
  testName: string;
  duration: number;
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  throughput: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

class StressTest {
  private attentionBus: AttentionBus;
  private intentParser: IntentParser;
  private runtime: RuntimeEngine;
  private renderer: MockRenderer;

  constructor() {
    this.attentionBus = new AttentionBus();
    this.intentParser = new IntentParser();
    this.runtime = new RuntimeEngine();
    this.renderer = new MockRenderer();
  }

  /**
   * 运行所有压力测试
   */
  async runAll(): Promise<void> {
    console.log('========================================');
    console.log('  压力测试');
    console.log('========================================\n');

    // 1. 高频事件流测试
    const highFreqResult = await this.testHighFrequencyEvents();
    this.printResult(highFreqResult);

    // 2. 突发流量测试
    const burstResult = await this.testBurstTraffic();
    this.printResult(burstResult);

    // 3. 持续负载测试
    const sustainedResult = await this.testSustainedLoad();
    this.printResult(sustainedResult);

    // 4. 内存压力测试
    const memoryResult = await this.testMemoryPressure();
    this.printResult(memoryResult);

    console.log('\n========================================');
    console.log('  压力测试完成');
    console.log('========================================\n');
  }

  /**
   * 高频事件流测试
   */
  private async testHighFrequencyEvents(): Promise<StressTestResult> {
    console.log('测试 1: 高频事件流 (1000 events/s for 10s)...');

    const duration = 10000; // 10 秒
    const targetRate = 1000; // 1000 events/s
    const latencies: number[] = [];
    let processedEvents = 0;
    let failedEvents = 0;

    const startTime = Date.now();
    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      try {
        const event = createRandomEvent();
        const eventStart = performance.now();

        this.attentionBus.push(event);
        const state = this.attentionBus.getState();

        if (event.eventType === 'comment') {
          const intent = this.intentParser.parse(event as any, state, 0);
          const decision = this.runtime.decide(intent, state);

          if (decision.actions.length > 0) {
            await this.renderer.execute(decision.actions[0]);
          }
        }

        const eventEnd = performance.now();
        latencies.push(eventEnd - eventStart);
        processedEvents++;

        // 控制速率
        await this.sleep(1000 / targetRate);
      } catch (error) {
        failedEvents++;
      }
    }

    const actualDuration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    return this.calculateResult(
      '高频事件流',
      actualDuration,
      processedEvents + failedEvents,
      processedEvents,
      failedEvents,
      latencies,
      memoryUsage
    );
  }

  /**
   * 突发流量测试
   */
  private async testBurstTraffic(): Promise<StressTestResult> {
    console.log('测试 2: 突发流量 (10000 events in 1s)...');

    const burstSize = 10000;
    const latencies: number[] = [];
    let processedEvents = 0;
    let failedEvents = 0;

    const startTime = Date.now();

    // 突发 10000 个事件
    for (let i = 0; i < burstSize; i++) {
      try {
        const event = createRandomEvent();
        const eventStart = performance.now();

        this.attentionBus.push(event);
        const state = this.attentionBus.getState();

        if (event.eventType === 'comment') {
          const intent = this.intentParser.parse(event as any, state, 0);
          this.runtime.decide(intent, state);
        }

        const eventEnd = performance.now();
        latencies.push(eventEnd - eventStart);
        processedEvents++;
      } catch (error) {
        failedEvents++;
      }
    }

    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    return this.calculateResult(
      '突发流量',
      duration,
      burstSize,
      processedEvents,
      failedEvents,
      latencies,
      memoryUsage
    );
  }

  /**
   * 持续负载测试
   */
  private async testSustainedLoad(): Promise<StressTestResult> {
    console.log('测试 3: 持续负载 (500 events/s for 30s)...');

    const duration = 30000; // 30 秒
    const targetRate = 500; // 500 events/s
    const latencies: number[] = [];
    let processedEvents = 0;
    let failedEvents = 0;

    const startTime = Date.now();
    const endTime = startTime + duration;
    let lastReport = startTime;

    while (Date.now() < endTime) {
      try {
        const event = createRandomEvent();
        const eventStart = performance.now();

        this.attentionBus.push(event);
        const state = this.attentionBus.getState();

        if (event.eventType === 'comment') {
          const intent = this.intentParser.parse(event as any, state, 0);
          const decision = this.runtime.decide(intent, state);

          if (decision.actions.length > 0) {
            await this.renderer.execute(decision.actions[0]);
          }
        }

        const eventEnd = performance.now();
        latencies.push(eventEnd - eventStart);
        processedEvents++;

        // 每 5 秒报告一次进度
        if (Date.now() - lastReport > 5000) {
          console.log(`  已处理 ${processedEvents} 个事件...`);
          lastReport = Date.now();
        }

        await this.sleep(1000 / targetRate);
      } catch (error) {
        failedEvents++;
      }
    }

    const actualDuration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    return this.calculateResult(
      '持续负载',
      actualDuration,
      processedEvents + failedEvents,
      processedEvents,
      failedEvents,
      latencies,
      memoryUsage
    );
  }

  /**
   * 内存压力测试
   */
  private async testMemoryPressure(): Promise<StressTestResult> {
    console.log('测试 4: 内存压力 (50000 events)...');

    const totalEvents = 50000;
    const latencies: number[] = [];
    let processedEvents = 0;
    let failedEvents = 0;

    const startTime = Date.now();

    for (let i = 0; i < totalEvents; i++) {
      try {
        const event = createRandomEvent();
        const eventStart = performance.now();

        this.attentionBus.push(event);
        const state = this.attentionBus.getState();

        if (event.eventType === 'comment') {
          const intent = this.intentParser.parse(event as any, state, 0);
          this.runtime.decide(intent, state);
        }

        const eventEnd = performance.now();
        latencies.push(eventEnd - eventStart);
        processedEvents++;

        // 每 10000 个事件报告一次
        if ((i + 1) % 10000 === 0) {
          const mem = process.memoryUsage();
          console.log(`  已处理 ${i + 1} 个事件, 内存: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        }
      } catch (error) {
        failedEvents++;
      }
    }

    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    return this.calculateResult(
      '内存压力',
      duration,
      totalEvents,
      processedEvents,
      failedEvents,
      latencies,
      memoryUsage
    );
  }

  /**
   * 计算结果
   */
  private calculateResult(
    testName: string,
    duration: number,
    totalEvents: number,
    processedEvents: number,
    failedEvents: number,
    latencies: number[],
    memoryUsage: NodeJS.MemoryUsage
  ): StressTestResult {
    const throughput = (processedEvents / duration) * 1000;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const sorted = latencies.sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      testName,
      duration,
      totalEvents,
      processedEvents,
      failedEvents,
      throughput,
      avgLatency,
      p50Latency: sorted[p50Index] || 0,
      p95Latency: sorted[p95Index] || 0,
      p99Latency: sorted[p99Index] || 0,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed / 1024 / 1024,
        heapTotal: memoryUsage.heapTotal / 1024 / 1024,
        external: memoryUsage.external / 1024 / 1024,
      },
    };
  }

  /**
   * 打印结果
   */
  private printResult(result: StressTestResult): void {
    console.log(`\n${result.testName} 结果:`);
    console.log(`  持续时间: ${result.duration}ms`);
    console.log(`  总事件数: ${result.totalEvents}`);
    console.log(`  处理成功: ${result.processedEvents}`);
    console.log(`  处理失败: ${result.failedEvents}`);
    console.log(`  吞吐量: ${result.throughput.toFixed(2)} events/s`);
    console.log(`  平均延迟: ${result.avgLatency.toFixed(3)}ms`);
    console.log(`  P50 延迟: ${result.p50Latency.toFixed(3)}ms`);
    console.log(`  P95 延迟: ${result.p95Latency.toFixed(3)}ms`);
    console.log(`  P99 延迟: ${result.p99Latency.toFixed(3)}ms`);
    console.log(`  内存使用:`);
    console.log(`    Heap Used: ${result.memoryUsage.heapUsed.toFixed(2)}MB`);
    console.log(`    Heap Total: ${result.memoryUsage.heapTotal.toFixed(2)}MB`);
    console.log(`    External: ${result.memoryUsage.external.toFixed(2)}MB`);
  }

  /**
   * Sleep 工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行压力测试
async function main() {
  const stressTest = new StressTest();
  await stressTest.runAll();
}

main().catch(console.error);
