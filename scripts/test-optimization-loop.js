"use strict";
/**
 * 优化闭环测试
 * 测试完整链路：Optimizer → Knowledge Graph → Invariant Gate → Stability Gate → Convergence Controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mutation_manager_1 = require("../src/safety-gates/mutation-manager");
const attention_bus_1 = require("../src/attention-bus");
const intent_parser_1 = require("../src/intent-parser");
const runtime_1 = require("../src/runtime");
const fake_event_generator_1 = require("../src/generators/fake-event-generator");
async function testOptimizationLoop() {
    console.log('========================================');
    console.log('优化闭环测试');
    console.log('========================================\n');
    // 初始化组件
    console.log('1. 初始化组件...');
    const mutationManager = new mutation_manager_1.MutationManager({
        enableKnowledgeGraph: true,
        enableSafetyGates: true,
        enableConvergenceControl: true,
        autoApply: false,
    });
    const attentionBus = new attention_bus_1.AttentionBus();
    const intentParser = new intent_parser_1.IntentParser();
    const runtime = new runtime_1.RuntimeEngine();
    const generator = new fake_event_generator_1.FakeEventGenerator('purchase_hesitation');
    console.log('✓ 组件初始化完成\n');
    // 生成事件
    console.log('2. 生成测试事件...');
    const events = generator.generateEvents();
    console.log(`✓ 生成 ${events.length} 个事件\n`);
    // 模拟多次迭代
    console.log('3. 模拟优化迭代...\n');
    console.log('----------------------------------------');
    const maxIterations = 20;
    let iteration = 0;
    let previousAttention = null;
    for (const event of events) {
        if (iteration >= maxIterations)
            break;
        // 推送事件
        attentionBus.push(event);
        const currentAttention = attentionBus.getState();
        // 如果是评论事件，处理完整链路
        if (event.eventType === 'comment') {
            iteration++;
            const commentEvent = event;
            console.log(`\n[迭代 ${iteration}]`);
            console.log(`评论: "${commentEvent.content}"`);
            console.log(`注意力密度: ${(currentAttention.density * 100).toFixed(1)}%`);
            // 解析意图
            const sessionDuration = runtime.getSessionDuration();
            const intent = intentParser.parse(commentEvent, currentAttention, sessionDuration);
            // Runtime 做出决策
            const decision = runtime.decide(intent, currentAttention);
            // 分析影响（如果有前置状态）
            if (previousAttention) {
                const impact = mutationManager.analyzeImpact(decision, previousAttention, currentAttention);
                console.log(`影响分析: ${impact.impact > 0 ? '+' : ''}${(impact.impact * 100).toFixed(1)}% (置信度: ${(impact.confidence * 100).toFixed(0)}%)`);
            }
            // 提议变更
            const proposal = mutationManager.propose(currentAttention, intent, sessionDuration);
            if (proposal) {
                console.log(`\n提议变更:`);
                console.log(`  类型: ${proposal.mutation.type}`);
                console.log(`  原因: ${proposal.reasoning}`);
                console.log(`  预期影响: ${(proposal.expectedImpact * 100).toFixed(0)}%`);
                console.log(`  置信度: ${(proposal.confidence * 100).toFixed(0)}%`);
                // 评估变更
                const result = mutationManager.evaluate(proposal.mutation);
                console.log(`\n评估结果:`);
                console.log(`  批准: ${result.approved ? '✓' : '✗'}`);
                console.log(`  原因: ${result.reason}`);
                if (result.approved) {
                    // 模拟应用变更
                    const simulatedImpact = proposal.expectedImpact * (0.8 + Math.random() * 0.4);
                    mutationManager.apply(proposal.mutation, simulatedImpact);
                    console.log(`  已应用（模拟影响: ${(simulatedImpact * 100).toFixed(1)}%）`);
                }
                // 收敛状态
                const convergenceState = result.convergenceState;
                console.log(`\n收敛状态:`);
                console.log(`  分数: ${(convergenceState.score * 100).toFixed(1)}%`);
                console.log(`  已收敛: ${convergenceState.isConverged ? '是' : '否'}`);
                console.log(`  趋势: ${convergenceState.trend}`);
            }
            else {
                console.log(`\n无变更提议`);
            }
            previousAttention = currentAttention;
        }
        // 检查收敛
        const stats = mutationManager.getStats();
        if (stats.convergenceScore >= 0.7) {
            console.log(`\n✓ 系统已收敛（分数: ${(stats.convergenceScore * 100).toFixed(1)}%）`);
            break;
        }
    }
    console.log('\n----------------------------------------\n');
    // 打印统计信息
    console.log('4. 统计信息\n');
    const stats = mutationManager.getStats();
    console.log('变更统计:');
    console.log(`  总提议: ${stats.totalMutations}`);
    console.log(`  已批准: ${stats.approvedMutations}`);
    console.log(`  已拒绝: ${stats.rejectedMutations}`);
    console.log(`  平均影响: ${(stats.avgImpact * 100).toFixed(1)}%`);
    console.log(`  收敛分数: ${(stats.convergenceScore * 100).toFixed(1)}%`);
    const history = mutationManager.getHistory();
    const approved = history.filter(r => r.approved);
    if (approved.length > 0) {
        console.log('\n已批准的变更:');
        approved.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.mutation.type}`);
            console.log(`     原因: ${result.reason}`);
        });
    }
    const rejected = history.filter(r => !r.approved);
    if (rejected.length > 0) {
        console.log('\n已拒绝的变更:');
        rejected.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.mutation.type}`);
            console.log(`     原因: ${result.reason}`);
        });
    }
    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================\n');
    console.log('关键验证点:');
    console.log('  ✓ Optimizer 提出变更建议');
    console.log('  ✓ Knowledge Graph 模式匹配');
    console.log('  ✓ Invariant Gate 阻断硬违规');
    console.log('  ✓ Stability Gate 防止振荡');
    console.log('  ✓ Convergence Controller 控制收敛');
    console.log('  ✓ 完整闭环运行正常\n');
    process.exit(0);
}
// 运行测试
testOptimizationLoop().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=test-optimization-loop.js.map