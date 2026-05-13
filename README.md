# Livestream Operating System

**Attention-Native Runtime for Live Commerce**

这是一个"直播操作系统"，而非"直播自动化工具"。系统能够实时理解用户注意力、自主调度场景、持续优化表现。

## 核心特性

- **Attention Bus**: 聚合原始事件流，计算注意力状态
- **Intent Parser**: 理解用户意图，分类评论
- **Runtime Engine**: 解释 DSL，评估规则，做出决策
- **SceneGraph Builder**: 管理场景结构，验证转换合法性
- **Mock Renderer**: 在没有 OBS 时验证系统闭环
- **OBS Adapter**: 连接 OBS Studio，执行渲染动作

## 架构

```
Event → Attention Bus → Intent Parser → Runtime → SceneGraph → Renderer
```

详细架构设计见 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 快速开始

### 安装依赖

```bash
npm install
```

### 验证闭环

```bash
npm run validate-loop
```

这将运行完整的事件流验证，测试 5 种场景：
- `purchase_hesitation` - 购买犹豫
- `high_engagement` - 高互动
- `price_sensitivity` - 价格敏感
- `drop_risk` - 流失风险
- `mixed` - 混合场景

### 生成伪造事件

```bash
npm run fake-events
```

### 测试 OBS 连接

```bash
npm run test-obs
```

这将测试 OBS WebSocket 连接和基本功能。

**前提条件**:
1. OBS Studio 已启动
2. WebSocket 服务器已启用 (工具 → obs-websocket 设置)
3. 端口号正确 (默认 4455)

### 测试 OBS 完整集成

```bash
npm run test-obs-integration
```

这将测试完整链路：Event → Attention Bus → Intent Parser → Runtime → SceneGraph → OBS

**建议的 OBS 场景配置**:
- `hook` - 开场场景
- `palatability_demo` - 适口性演示场景
- `price_promotion` - 价格促销场景
- `checkout_guide` - 下单引导场景

**建议的 OBS 源配置**:
- `picky_eating_badge` - 挑食徽章贴片
- `discount_badge` - 优惠徽章贴片
- `buy_button` - 购买按钮
- `test_text` - 测试文字源

## 核心概念

### 1. Scene 是 Dumb 的

**错误做法**:
```
Scene: "如果弹幕包含'价格'，显示优惠贴片"
```

**正确做法**:
```
Runtime: "检测到价格敏感意图 → 指令 Scene 显示优惠贴片"
Scene: (被动执行，无逻辑)
```

### 2. Attention 是核心 Truth

**错误指标**:
- Watch time
- Like count
- Completion rate

**正确指标**:
- Attention curve: `A(t)`
- Attention momentum: `dA/dt`
- Attention density: `∫ A(t) dt / Δt`

### 3. 真正阻断，而非记录日志

**错误做法**:
```typescript
if (hardViolation) {
  logger.error("Hard violation detected");
  // 继续执行
}
```

**正确做法**:
```typescript
const allowed = hardViolations.length === 0;
if (!allowed) {
  return { status: "blocked", reason: hardViolations };
}
```

## 示例场景

### 购买犹豫场景

用户连续询问"挑食能吃吗"，系统自动：

1. 识别意图: `purchase_hesitation` (置信度 0.87)
2. 切换场景: `palatability_demo`
3. 显示贴片: `picky_eating_badge`
4. 自动回复: "我家这只以前也挑，现在吃得可香了~"
5. 高亮产品: `cat_food_001`

### 价格敏感场景

用户询问"多少钱"、"有优惠吗"，系统自动：

1. 识别意图: `price_sensitivity` (置信度 0.85)
2. 切换场景: `price_promotion`
3. 显示贴片: `discount_badge`
4. 自动回复: "现在下单有优惠哦，限时 9 折！"

## 性能指标

Phase 0 验证成功标准：

- **事件处理延迟**: < 100ms (从事件到决策)
- **意图分类准确率**: > 85% (在测试集上)
- **闭环完整性**: 100% (事件 → 执行 → 记录)
- **Mock 渲染正确性**: 100% (与预期一致)

## 开发路线

### Phase 0: 核心链路验证 ✓

**目标**: 验证"事件 → 理解 → 决策 → 执行"闭环

**交付物**:
- Fake Event Generator
- Attention Bus (基础版)
- Intent Parser (规则引擎)
- Runtime (DSL interpreter)
- SceneGraph (基础结构)
- Mock Renderer

### Phase 1: OBS 集成 (Week 3-4)

**目标**: 接入真实渲染层

**交付物**:
- OBS WebSocket Adapter
- Scene configuration schema
- OBS scene templates

### Phase 2: 抖音数据接入 (Week 5-6)

**目标**: 接入真实数据源

**交付物**:
- Douyin API Adapter
- Event normalizer
- Data quality validator

### Phase 3: 优化闭环 (Week 7-8)

**目标**: 实现 Mutation 和 Knowledge Graph

**交付物**:
- Optimizer with impact analysis
- Invariant Gate
- Stability Gate
- Convergence Controller
- Knowledge Graph (基础版)

### Phase 4: 生产就绪 (Week 9-10)

**目标**: 稳定性、监控、部署

**交付物**:
- Error handling & recovery
- Monitoring dashboards
- Deployment scripts
- Documentation

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm test -- --coverage
```

## 代码风格

```bash
# 检查代码风格
npm run lint
```

## 技术栈

- **Language**: TypeScript
- **Runtime**: Node.js
- **State Management**: XState
- **Event Stream**: RxJS
- **OBS Integration**: obs-websocket-js
- **Storage**: SQLite (local) / TimescaleDB (production)

## 许可证

MIT
