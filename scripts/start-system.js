"use strict";
/**
 * 启动脚本
 * 运行: npm run start
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
async function startSystem() {
    console.log('========================================');
    console.log('  Livestream OS - 启动脚本');
    console.log('========================================\n');
    try {
        // 创建系统实例
        const system = new index_1.LivestreamOS();
        // 优雅关闭
        process.on('SIGINT', async () => {
            console.log('\n收到 SIGINT 信号，正在关闭...');
            await system.shutdown();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\n收到 SIGTERM 信号，正在关闭...');
            await system.shutdown();
            process.exit(0);
        });
        // 启动系统
        await system.start();
        // 定期打印状态
        setInterval(() => {
            const status = system.getStatus();
            console.log('\n[Status]', {
                running: status.isRunning,
                obs: status.obsConnected ? '✓' : '✗',
                mode: status.useFakeData ? '模拟' : '真实',
                attention: (status.currentAttention * 100).toFixed(1) + '%',
                alerts: status.activeAlerts,
            });
        }, 30000); // 每 30 秒
    }
    catch (error) {
        console.error('\n系统启动失败:', error);
        process.exit(1);
    }
}
// 运行
startSystem();
//# sourceMappingURL=start-system.js.map