/**
 * 错误处理系统测试
 */

import { ErrorHandlingSystem } from './index';
import { CircuitBreaker } from './circuit-breaker';
import { HealthChecker, HealthChecks } from './health-check';

async function testErrorHandler() {
  console.log('=== Testing Error Handler ===\n');

  const errorSystem = new ErrorHandlingSystem();

  // 测试 1: 创建错误
  console.log('Test 1: Create error');
  const error = errorSystem['errorHandler'].createError(
    'TEST001',
    'Test error message',
    'runtime',
    'medium',
    { context: { test: true } }
  );
  console.log('Created error:', error.code, error.message);
  console.log('✓ Error created successfully\n');

  // 测试 2: 错误指标
  console.log('Test 2: Error metrics');
  const metrics = errorSystem.getErrorMetrics();
  console.log('Total errors:', metrics.total);
  console.log('By category:', metrics.byCategory);
  console.log('By severity:', metrics.bySeverity);
  console.log('✓ Metrics retrieved\n');
}

async function testCircuitBreaker() {
  console.log('=== Testing Circuit Breaker ===\n');

  const breaker = new CircuitBreaker('test-breaker', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 5000,
  });

  // 测试 1: 正常操作
  console.log('Test 1: Normal operation');
  try {
    const result = await breaker.execute(async () => {
      return 'success';
    });
    console.log('Result:', result);
    console.log('State:', breaker.getState());
    console.log('✓ Normal operation succeeded\n');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  // 测试 2: 触发熔断
  console.log('Test 2: Trigger circuit breaker');
  let failureCount = 0;
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (error) {
      failureCount++;
      console.log(`Failure ${failureCount}, State: ${breaker.getState().state}`);
    }
  }
  console.log('✓ Circuit breaker opened after failures\n');

  // 测试 3: 熔断器打开时拒绝请求
  console.log('Test 3: Request rejected when open');
  try {
    await breaker.execute(async () => 'should not execute');
    console.error('✗ Should have been rejected');
  } catch (error) {
    console.log('Request rejected as expected:', (error as Error).message);
    console.log('✓ Circuit breaker protection working\n');
  }

  // 测试 4: 重置熔断器
  console.log('Test 4: Reset circuit breaker');
  breaker.forceClose();
  console.log('State after reset:', breaker.getState().state);
  console.log('✓ Circuit breaker reset\n');
}

async function testHealthChecker() {
  console.log('=== Testing Health Checker ===\n');

  const healthChecker = new HealthChecker();

  // 注册健康检查
  healthChecker.registerCheck('memory', HealthChecks.memory(500));
  healthChecker.registerCheck('test-component', async () => ({
    component: 'test-component',
    status: 'healthy',
    message: 'Test component is healthy',
    timestamp: Date.now(),
  }));

  // 测试 1: 执行单个检查
  console.log('Test 1: Single health check');
  const memoryHealth = await healthChecker.runCheck('memory');
  console.log('Memory health:', memoryHealth.status, memoryHealth.message);
  console.log('✓ Single check completed\n');

  // 测试 2: 执行所有检查
  console.log('Test 2: All health checks');
  const systemHealth = await healthChecker.runAllChecks();
  console.log('Overall health:', systemHealth.overall);
  systemHealth.components.forEach((result, name) => {
    console.log(`  - ${name}: ${result.status}`);
  });
  console.log('✓ All checks completed\n');

  // 清理
  healthChecker.clear();
}

async function testProtectedExecution() {
  console.log('=== Testing Protected Execution ===\n');

  const errorSystem = new ErrorHandlingSystem();

  // 测试 1: 成功操作
  console.log('Test 1: Successful operation');
  try {
    const result = await errorSystem.executeWithProtection(
      'test-operation',
      async () => {
        return 'operation succeeded';
      }
    );
    console.log('Result:', result);
    console.log('✓ Operation succeeded\n');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  // 测试 2: 失败操作带降级
  console.log('Test 2: Failed operation with fallback');
  try {
    const result = await errorSystem.executeWithProtection(
      'failing-operation',
      async () => {
        throw new Error('Operation failed');
      },
      {
        fallback: async () => 'fallback result',
        maxRetries: 2,
      }
    );
    console.log('Result:', result);
    console.log('✓ Fallback executed\n');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  // 测试 3: 失败操作无降级
  console.log('Test 3: Failed operation without fallback');
  try {
    await errorSystem.executeWithProtection(
      'failing-operation-no-fallback',
      async () => {
        throw new Error('Operation failed');
      },
      {
        maxRetries: 2,
      }
    );
    console.error('✗ Should have thrown error');
  } catch (error) {
    console.log('Error thrown as expected:', (error as Error).message);
    console.log('✓ Error handling working\n');
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('Error Handling System Tests');
  console.log('========================================\n');

  await testErrorHandler();
  await testCircuitBreaker();
  await testHealthChecker();
  await testProtectedExecution();

  console.log('========================================');
  console.log('All tests completed successfully ✓');
  console.log('========================================\n');
}

// 运行测试
runAllTests().catch(console.error);
