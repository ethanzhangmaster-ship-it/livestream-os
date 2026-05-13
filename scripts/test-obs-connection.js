"use strict";
/**
 * OBS 集成测试脚本
 * 测试 OBS WebSocket 连接和基本功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
const obs_adapter_1 = require("../src/render-adapter/obs-adapter");
async function testOBSConnection() {
    console.log('========================================');
    console.log('OBS WebSocket 连接测试');
    console.log('========================================\n');
    // 创建 OBS Adapter
    const obs = new obs_adapter_1.OBSAdapter({
        host: 'localhost',
        port: 4455,
        password: '', // 如果设置了密码，在这里填写
    });
    // 测试连接
    console.log('1. 测试连接...');
    const status = await obs.connect();
    if (!status.connected) {
        console.error('❌ 连接失败:', status.error);
        console.log('\n请确保:');
        console.log('  1. OBS Studio 已启动');
        console.log('  2. WebSocket 服务器已启用 (工具 → obs-websocket 设置)');
        console.log('  3. 端口号正确 (默认 4455)');
        console.log('  4. 密码正确 (如果设置了密码)');
        process.exit(1);
    }
    console.log('✓ 连接成功');
    console.log(`  OBS 版本: ${status.obsVersion}`);
    console.log(`  WebSocket 版本: ${status.obsWebSocketVersion}\n`);
    // 测试获取场景列表
    console.log('2. 测试获取场景列表...');
    const scenes = await obs.getSceneList();
    console.log(`✓ 找到 ${scenes.length} 个场景:`);
    scenes.forEach((scene, index) => {
        console.log(`  ${index + 1}. ${scene}`);
    });
    console.log();
    // 测试获取当前场景
    console.log('3. 测试获取当前场景...');
    const currentScene = await obs.getCurrentScene();
    console.log(`✓ 当前场景: ${currentScene}\n`);
    // 测试场景切换
    if (scenes.length >= 2) {
        console.log('4. 测试场景切换...');
        const targetScene = scenes.find(s => s !== currentScene) || scenes[1];
        console.log(`  切换到: ${targetScene}`);
        const switchResult = await obs.execute({
            type: 'scene_switch',
            target: targetScene,
        });
        if (switchResult.success) {
            console.log(`✓ ${switchResult.message}\n`);
            // 等待 2 秒
            console.log('  等待 2 秒后切回原场景...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // 切回原场景
            await obs.execute({
                type: 'scene_switch',
                target: currentScene,
            });
            console.log(`✓ 已切回: ${currentScene}\n`);
        }
        else {
            console.error(`❌ 场景切换失败: ${switchResult.message}\n`);
        }
    }
    else {
        console.log('4. 跳过场景切换测试 (需要至少 2 个场景)\n');
    }
    // 测试文字更新
    console.log('5. 测试文字更新...');
    console.log('  提示: 需要在 OBS 中创建名为 "test_text" 的文字源');
    const textResult = await obs.execute({
        type: 'text_update',
        element: 'test_text',
        content: 'Livestream OS 测试 - ' + new Date().toLocaleTimeString(),
    });
    if (textResult.success) {
        console.log(`✓ ${textResult.message}\n`);
    }
    else {
        console.log(`⚠ 文字更新失败: ${textResult.message}`);
        console.log('  这是正常的，如果 OBS 中没有 "test_text" 文字源\n');
    }
    // 测试贴片显示
    console.log('6. 测试贴片显示...');
    console.log('  提示: 需要在当前场景中创建名为 "test_overlay" 的源');
    const overlayResult = await obs.execute({
        type: 'overlay_show',
        target: 'test_overlay',
        duration: 3000,
    });
    if (overlayResult.success) {
        console.log(`✓ ${overlayResult.message}`);
        console.log('  将在 3 秒后自动隐藏\n');
        // 等待 4 秒让贴片自动隐藏
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
    else {
        console.log(`⚠ 贴片显示失败: ${overlayResult.message}`);
        console.log('  这是正常的，如果场景中没有 "test_overlay" 源\n');
    }
    // 断开连接
    console.log('7. 断开连接...');
    await obs.disconnect();
    console.log('✓ 已断开连接\n');
    console.log('========================================');
    console.log('测试完成');
    console.log('========================================\n');
    process.exit(0);
}
// 运行测试
testOBSConnection().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=test-obs-connection.js.map