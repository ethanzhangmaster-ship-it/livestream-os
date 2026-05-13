/**
 * OBS 场景切换测试脚本
 * 
 * 使用方法：
 *   npm run test-obs-scene
 * 
 * 测试 OBS WebSocket 连接和场景切换功能
 */

import { OBSAdapter } from '../src/render-adapter/obs-adapter';

async function testOBSSceneSwitch() {
  console.log('========================================');
  console.log('  OBS 场景切换测试');
  console.log('========================================\n');

  // OBS 配置
  const obsConfig = {
    host: process.env.OBS_HOST || 'localhost',
    port: parseInt(process.env.OBS_PORT || '4455'),
    password: process.env.OBS_PASSWORD || '',
    autoReconnect: true,
  };

  console.log('OBS 配置:');
  console.log(`  Host: ${obsConfig.host}`);
  console.log(`  Port: ${obsConfig.port}`);
  console.log(`  Auto Reconnect: ${obsConfig.autoReconnect}\n`);

  // 创建 OBS 适配器
  const obsAdapter = new OBSAdapter(obsConfig);

  try {
    // 1. 连接 OBS
    console.log('[1/5] 连接 OBS...');
    const status = await obsAdapter.connect();
    
    if (!status.connected) {
      console.error('❌ OBS 连接失败');
      console.log('\n请检查:');
      console.log('  1. OBS 是否正在运行？');
      console.log('  2. WebSocket 服务器是否启用？');
      console.log('  3. 端口号是否正确？（默认 4455）');
      console.log('  4. 防火墙是否阻止连接？');
      return;
    }
    
    console.log('✓ OBS 连接成功\n');

    // 2. 获取当前场景
    console.log('[2/5] 获取当前场景...');
    const currentScene = await obsAdapter.getCurrentScene();
    
    if (!currentScene) {
      console.error('❌ 无法获取当前场景');
      return;
    }
    
    console.log(`✓ 当前场景: ${currentScene}\n`);

    // 3. 获取所有场景
    console.log('[3/5] 获取所有场景...');
    const scenes = await obsAdapter.getSceneList();
    console.log(`✓ 场景列表 (${scenes.length} 个):`);
    scenes.forEach((scene: string, index: number) => {
      console.log(`  ${index + 1}. ${scene}`);
    });
    console.log();

    // 4. 测试场景切换
    console.log('[4/5] 测试场景切换...\n');
    
    const testScenes = ['hook', 'narration', 'stats', 'cta', 'qa', 'idle'];
    
    for (const sceneName of testScenes) {
      if (scenes.includes(sceneName)) {
        console.log(`  切换到场景: ${sceneName}`);
        const result = await obsAdapter.execute({
          type: 'scene_switch',
          target: sceneName,
        });
        
        if (result.success) {
          console.log(`  ✓ 已切换到: ${sceneName}\n`);
        } else {
          console.log(`  ❌ 切换失败: ${result.message}\n`);
        }
        
        // 等待 2 秒
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`  ⚠️  场景不存在: ${sceneName}`);
        console.log(`     请在 OBS 中创建该场景\n`);
      }
    }

    // 5. 恢复原始场景
    console.log('[5/5] 恢复原始场景...');
    await obsAdapter.execute({
      type: 'scene_switch',
      target: currentScene,
    });
    console.log(`✓ 已恢复到: ${currentScene}\n`);

    console.log('========================================');
    console.log('  测试完成');
    console.log('========================================\n');

    // 断开连接
    await obsAdapter.disconnect();
    console.log('✓ 已断开 OBS 连接');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.log('\n故障排查:');
    console.log('  1. 确认 OBS 正在运行');
    console.log('  2. 确认 WebSocket 服务器已启用');
    console.log('  3. 确认端口号和密码正确');
    console.log('  4. 查看详细错误信息');
  }
}

// 运行测试
testOBSSceneSwitch();
