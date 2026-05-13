/**
 * 监控系统测试
 */

import { MonitoringSystem } from './index';

async function testMonitoringSystem() {
  console.log('=== Testing Monitoring System ===\n');

  const monitoring = new MonitoringSystem(8080);

  // 测试 1: 初始化监控系统
  console.log('Test 1: Initialize monitoring system');
  await monitoring.initialize();
  console.log('✓ Monitoring system initialized\n');

  // 测试 2: 记录事件延迟
  console.log('Test 2: Record event latency');
  for (let i = 0; i < 10; i++) {
    const latency = Math.random() * 100;
    monitoring.recordEventLatency(latency);
  }
  console.log('✓ Event latency recorded\n');

  // 测试 3: 记录决策延迟
  console.log('Test 3: Record decision latency');
  for (let i = 0; i < 5; i++) {
    const latency = Math.random() * 50;
    monitoring.recordDecisionLatency(latency, Math.random() > 0.2);
  }
  console.log('✓ Decision latency recorded\n');

  // 测试 4: 记录场景切换
  console.log('Test 4: Record scene switch');
  for (let i = 0; i < 3; i++) {
    const latency = Math.random() * 200;
    monitoring.recordSceneSwitch(latency, Math.random() > 0.1);
  }
  console.log('✓ Scene switch recorded\n');

  // 测试 5: 更新注意力指标
  console.log('Test 5: Update attention metrics');
  monitoring.updateAttentionMetrics(
    0.65, // avgAttention
    150, // activeUsers
    0.45, // engagementRate
    0.12 // conversionRate
  );
  console.log('✓ Attention metrics updated\n');

  // 测试 6: 更新连接状态
  console.log('Test 6: Update connection status');
  monitoring.updateConnectionStatus(true, false);
  console.log('✓ Connection status updated\n');

  // 测试 7: 记录优化影响
  console.log('Test 7: Record optimization impact');
  for (let i = 0; i < 5; i++) {
    const impact = (Math.random() - 0.5) * 0.2;
    monitoring.recordOptimizationImpact(impact);
  }
  console.log('✓ Optimization impact recorded\n');

  // 测试 8: 获取当前快照
  console.log('Test 8: Get current snapshot');
  const snapshot = monitoring.getCurrentSnapshot();
  console.log('Snapshot timestamp:', new Date(snapshot.timestamp).toISOString());
  if (snapshot.performance) {
    console.log('Performance metrics:');
    console.log('  - Event latency:', snapshot.performance.eventProcessingLatency.toFixed(2), 'ms');
    console.log('  - Memory usage:', snapshot.performance.memoryUsage.toFixed(2), 'MB');
  }
  if (snapshot.business) {
    console.log('Business metrics:');
    console.log('  - Avg attention:', (snapshot.business.avgAttention * 100).toFixed(1), '%');
    console.log('  - Active users:', snapshot.business.activeUsers);
  }
  if (snapshot.system) {
    console.log('System metrics:');
    console.log('  - Health:', snapshot.system.healthStatus);
    console.log('  - OBS connected:', snapshot.system.obsConnected);
  }
  console.log('✓ Snapshot retrieved\n');

  // 测试 9: 获取仪表板 URL
  console.log('Test 9: Get dashboard URL');
  const dashboardUrl = monitoring.getDashboardUrl();
  console.log('Dashboard URL:', dashboardUrl);
  console.log('✓ Dashboard URL retrieved\n');

  // 测试 10: 等待一段时间让仪表板可访问
  console.log('Test 10: Dashboard is accessible');
  console.log('Open the dashboard in your browser:', dashboardUrl);
  console.log('Waiting 10 seconds before shutdown...\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  // 关闭监控系统
  console.log('Shutting down monitoring system...');
  await monitoring.shutdown();
  console.log('✓ Monitoring system shut down\n');

  console.log('========================================');
  console.log('All monitoring tests completed ✓');
  console.log('========================================\n');
}

// 运行测试
testMonitoringSystem().catch(console.error);
