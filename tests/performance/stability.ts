/**
 * 稳定性测试
 * 测试系统长时间运行的稳定性
 */

import { AttentionBus } from '../../src/attention-bus';
import { IntentParser } from '../../src/intent-parser';
import { RuntimeEngine } from '../../src/runtime';
import { MockRenderer } from '../../src/render-adapter/mock-renderer';
import { createRandomEvent } from '../helpers/event-factory';

interface StabilityMetrics {
  timestamp: number;
  processedEvents: number;
  errors: number;
  avgLatency: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class StabilityTest {
  private attentionBus: AttentionBus;
  private intentParser: IntentParser;
  private runtime: RuntimeEngine;
  private renderer: MockRenderer;

  private processedEvents = 0;
  private errors = 0;
  private latencies: number[] = [];
  private metrics: StabilityMetrics[] = [];

  constructor() {
    this.attentionBus = new AttentionBus();
    this.intentParser = new IntentParser();
    this.runtime = new RuntimeEngine();
    this.renderer = new MockRenderer();
  }

  /**
   * 运行稳定性测试
   */
  async run(durationMinutes: number = 5): Promise<void> {
    console.log('========================================');
    console.log('  稳定性测试');
    console.log('========================================\n');
    console.log(`测试时长: ${durationMinutes} 分钟`);
    console.log(`目标速率: 100 events/s\n`);

    const duration = durationMinutes * 60 * 1000; // 转换为毫秒
    const targetRate = 100; // 100 events/s
    const reportInterval = 30000; // 每 30 秒报告一次

    const startTime = Date.now();
    const endTime = startTime + duration;
    let lastReport = startTime;

    console.log('开始测试...\n');

    // 启动定期报告
    const reportTimer = setInterval(() => {
      this.reportProgress(startTime);
    }, reportInterval);

    // 主循环
    while (Date.now() < endTime) {
      try {
        await this.processEvent();
      } catch (error) {
        this.errors++;
        console.error('事件处理错误:', error);
      }

      // 控制速率
      await this.sleep(1000 / targetRate);
    }

    // 停止报告
    clearInterval(reportTimer);

    // 最终报告
    const actualDuration = Date.now() - startTime;
    await this.generateReport(actualDuration);
  }

  /**
   * 处理单个事件
   */
  private async processEvent(): Promise<void> {
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
    this.latencies.push(eventEnd - eventStart);
    this.processedEvents++;

    // 记录指标
    if (this.latencies.length % 1000 === 0) {
      this.recordMetrics();
    }
  }

  /**
   * 记录指标
   */
  private recordMetrics(): void {
    const recentLatencies = this.latencies.slice(-1000);
    const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;

    this.metrics.push({
      timestamp: Date.now(),
      processedEvents: this.processedEvents,
      errors: this.errors,
      avgLatency,
      memoryUsage: process.memoryUsage(),
    });
  }

  /**
   * 报告进度
   */
  private reportProgress(startTime: number): void {
    const elapsed = (Date.now() - startTime) / 1000;
    const mem = process.memoryUsage();
    const recentLatencies = this.latencies.slice(-1000);
    const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;

    console.log(`[+${elapsed.toFixed(0)}s] 已处理 ${this.processedEvents} 个事件, 错误: ${this.errors}, 平均延迟: ${avgLatency.toFixed(2)}ms, 内存: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * 生成最终报告
   */
  private async generateReport(duration: number): Promise<void> {
    console.log('\n========================================');
    console.log('  稳定性测试报告');
    console.log('========================================\n');

    const mem = process.memoryUsage();
    const avgLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
    const throughput = (this.processedEvents / duration) * 1000;

    console.log('总体统计:');
    console.log(`  测试时长: ${(duration / 1000 / 60).toFixed(2)} 分钟`);
    console.log(`  处理事件: ${this.processedEvents}`);
    console.log(`  错误数量: ${this.errors}`);
    console.log(`  错误率: ${((this.errors / this.processedEvents) * 100).toFixed(4)}%`);
    console.log(`  吞吐量: ${throughput.toFixed(2)} events/s`);
    console.log(`  平均延迟: ${avgLatency.toFixed(3)}ms`);

    // 延迟分布
    const sorted = [...this.latencies].sort((a, b) => a - b);
    console.log('\n延迟分布:');
    console.log(`  P50: ${sorted[Math.floor(sorted.length * 0.5)].toFixed(3)}ms`);
    console.log(`  P95: ${sorted[Math.floor(sorted.length * 0.95)].toFixed(3)}ms`);
    console.log(`  P99: ${sorted[Math.floor(sorted.length * 0.99)].toFixed(3)}ms`);
    console.log(`  最大: ${sorted[sorted.length - 1].toFixed(3)}ms`);

    // 内存使用
    console.log('\n内存使用:');
    console.log(`  Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS: ${(mem.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  External: ${(mem.external / 1024 / 1024).toFixed(2)}MB`);

    // 内存增长趋势
    if (this.metrics.length >= 2) {
      const firstMetric = this.metrics[0];
      const lastMetric = this.metrics[this.metrics.length - 1];
      const memoryGrowth = lastMetric.memoryUsage.heapUsed - firstMetric.memoryUsage.heapUsed;

      console.log('\n内存增长:');
      console.log(`  初始: ${(firstMetric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  最终: ${(lastMetric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  增长: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      if (memoryGrowth > 100 * 1024 * 1024) { // 超过 100MB
        console.log(`  ⚠️  警告: 内存增长过大，可能存在内存泄漏`);
      }
    }

    // 性能稳定性
    if (this.metrics.length >= 10) {
      const latenciesByPeriod = this.metrics.map(m => m.avgLatency);
      const avgOfAvgs = latenciesByPeriod.reduce((a, b) => a + b, 0) / latenciesByPeriod.length;
      const variance = latenciesByPeriod.reduce((sum, l) => sum + Math.pow(l - avgOfAvgs, 2), 0) / latenciesByPeriod.length;
      const stdDev = Math.sqrt(variance);

      console.log('\n性能稳定性:');
      console.log(`  平均延迟: ${avgOfAvgs.toFixed(3)}ms`);
      console.log(`  标准差: ${stdDev.toFixed(3)}ms`);
      console.log(`  变异系数: ${((stdDev / avgOfAvgs) * 100).toFixed(2)}%`);

      if (stdDev / avgOfAvgs > 0.5) {
        console.log(`  ⚠️  警告: 性能波动较大`);
      }
    }

    console.log('\n========================================');
    console.log('  测试完成');
    console.log('========================================\n');
  }

  /**
   * Sleep 工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行稳定性测试
async function main() {
  const duration = process.argv[2] ? parseInt(process.argv[2]) : 5; // 默认 5 分钟
  const test = new StabilityTest();
  await test.run(duration);
}

main().catch(console.error);
