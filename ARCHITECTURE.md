# Livestream Operating System - 架构设计

## 系统定位

**Constrained Self-Modifying Execution Kernel for Attention-Native Livestream**

这不是"直播自动化工具"，而是"直播操作系统"——一个能够实时理解用户注意力、自主调度场景、持续优化表现的运行时系统。

---

## 核心认知

### 直播的本质

直播不是视频流，而是 **Attention Event Stream**。

**输入流**:
- `UserEnter` - 用户进入
- `Comment` - 弹幕评论
- `LikeBurst` - 点赞爆发
- `Gift` - 礼物事件
- `WatchDuration` - 停留时长
- `ClickCart` - 点击购物车
- `Exit` - 用户离开
- `Replay` - 回放请求

**输出流**:
- `SceneSwitch` - 场景切换
- `OverlayMutation` - 贴片变化
- `AutoResponse` - 自动回复
- `ProductHighlight` - 商品高亮

**Scene 不是输入，而是 Attention State 的视觉投影**。

---

## 架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        Input Layer                               │
│  Douyin API | Fake Event Generator | Manual Input               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Attention Bus                               │
│  Event Aggregator | State Machine | Momentum Calculator         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Input:  Raw Events (Comment, Like, Enter, Exit...)     │   │
│  │  Output: AttentionState { density, momentum, pattern }  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Intent Parser                               │
│  NLU Engine | Context Tracker | Confidence Scorer               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Input:  Comment + AttentionState + History             │   │
│  │  Output: Intent { type, confidence, subIntent }         │   │
│  │                                                          │   │
│  │  Example:                                                │   │
│  │    "挑食能吃吗" → {                                      │   │
│  │      type: "purchase_hesitation",                        │   │
│  │      confidence: 0.87,                                   │   │
│  │      subIntent: "picky_eating",                          │   │
│  │      recommendedScene: "palatability_demo",              │   │
│  │      conversionProbability: "high"                       │   │
│  │    }                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Runtime Engine                              │
│  DSL Interpreter | Rule Engine | Decision Maker                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Core Responsibility:                                    │   │
│  │    - Interpret DSL scripts                               │   │
│  │    - Evaluate rules against AttentionState               │   │
│  │    - Decide actions (scene switch, overlay, reply)       │   │
│  │    - Coordinate between layers                           │   │
│  │                                                          │   │
│  │  Design Principle:                                       │   │
│  │    "Scene 必须是 dumb 的，智能在 Runtime Layer"          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SceneGraph Builder                          │
│  Scene Tree | Transition Matrix | Constraint Validator          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Input:  Runtime Decision                                │   │
│  │  Output: SceneGraph { nodes, edges, activeNode }         │   │
│  │                                                          │   │
│  │  Validation:                                             │   │
│  │    - Structural correctness (no orphan scenes)           │   │
│  │    - Transition validity (allowed edges only)            │   │
│  │    - Resource constraints (GPU, memory, time)            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Render Adapter                              │
│  OBS WebSocket | Mock Renderer | Future: Unreal/Unity           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  OBS = GPU (Render Only)                                 │   │
│  │  - No business logic in OBS                              │   │
│  │  - No conditional branching in scenes                    │   │
│  │  - Pure execution layer                                  │   │
│  │                                                          │   │
│  │  Capabilities:                                           │   │
│  │    - Scene switch                                        │   │
│  │    - Source toggle (show/hide)                           │   │
│  │    - Text update                                         │   │
│  │    - Filter adjustment                                   │   │
│  │    - Recording control                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Metrics Collector                           │
│  Event Logger | Attention Reconstruction | Performance Tracker  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Attention Reconstruction (Core Moat):                   │   │
│  │    A(t) = A_base + Σ kernels + priors - noise            │   │
│  │                                                          │   │
│  │  Event Kernel Map:                                       │   │
│  │    pause → Gaussian(μ=0, σ=2)                            │   │
│  │    rewind → Gaussian(μ=-1, σ=1.5)                        │   │
│  │    like → Gaussian(μ=0, σ=0.5)                           │   │
│  │    skip → Gaussian(μ=1, σ=1)                             │   │
│  │                                                          │   │
│  │  Scene Priors:                                           │   │
│  │    hook → attention_curve(0-4s)                          │   │
│  │    narration → attention_curve(4-15s)                    │   │
│  │    stats → attention_curve(15-25s)                       │   │
│  │    cta → attention_curve(25-30s)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Optimizer                                   │
│  Impact Analyzer | Mutation Proposer | Strategy Selector        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Runtime Attribution:                                    │   │
│  │    Impact(m) = ∫ [A(t) - A_prior(t)] * kernel(t-t_m) dt  │   │
│  │                                                          │   │
│  │  Shapley Value for overlapping mutations                 │   │
│  │                                                          │   │
│  │  Mutation Types:                                         │   │
│  │    - SceneDuration { scene, delta }                      │   │
│  │    - OverlayTiming { overlay, showAt, hideAt }           │   │
│  │    - TransitionSpeed { from, to, duration }              │   │
│  │    - TextContent { element, newText }                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Safety Gates                                │
│  Invariant Gate | Stability Gate | Convergence Controller       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Invariant Gate (Behavioral Correctness):               │   │
│  │    Hard Violations:                                      │   │
│  │      - Hook duration > 4s                                │   │
│  │      - Scene transition to invalid target                │   │
│  │      - Overlay obscures critical content                 │   │
│  │    → Action: BLOCK mutation                              │   │
│  │                                                          │   │
│  │    Soft Violations:                                      │   │
│  │      - Average attention < 0.5                           │   │
│  │      - Drop risk > 0.6                                   │   │
│  │    → Action: WARN but allow                              │   │
│  │                                                          │   │
│  │  Stability Gate (Safety Correctness):                    │   │
│  │    - Mutation step size ≤ 0.3                            │   │
│  │    - No rapid oscillation                                │   │
│  │                                                          │   │
│  │  Convergence Controller:                                 │   │
│  │    - Track stability score over time                     │   │
│  │    - Terminate when convergence score ≥ 0.7              │   │
│  │    - Max 100 mutation cycles                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Knowledge Graph (Phase 2)                   │
│  Pattern Storage | Matcher | Aggregator | Evolution Injector     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Storage: SQLite                                         │   │
│  │    - pattern_id, mutation_type, context_hash             │   │
│  │    - avg_impact, variance, confidence                    │   │
│  │                                                          │   │
│  │  Pattern Matcher:                                        │   │
│  │    - Context fingerprinting with quantized features      │   │
│  │    - Match similar historical situations                 │   │
│  │                                                          │   │
│  │  Pattern Aggregator:                                     │   │
│  │    - Welford's algorithm for online statistics           │   │
│  │    - Numerically stable mean/variance updates            │   │
│  │                                                          │   │
│  │  Evolution Injector:                                     │   │
│  │    - Recommend strategies from Knowledge Graph           │   │
│  │    - Balance exploration vs exploitation                 │   │
│  │                                                          │   │
│  │  Closed-loop:                                            │   │
│  │    Record outcome → Update pattern → Recommend strategy  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 数据流与事件模型

### 完整闭环

```
Event (弹幕)
  → Attention Bus (聚合状态)
  → Intent Parser (理解意图)
  → Runtime (决策)
  → SceneGraph (结构验证)
  → OBS (执行渲染)
  → Metrics (收集反馈)
  → Optimizer (分析影响)
  → Mutation (提出优化)
  → Safety Gates (安全检查)
  → Apply (应用变更)
  → Knowledge Graph (记录模式)
```

### 实时响应示例

**场景**: 用户连续 15 秒问"挑食能吃吗"

```
1. Event Stream:
   Comment("挑食能吃吗") x 5 in 15s

2. Attention Bus:
   State {
     density: "high",
     topic: "picky_eating",
     momentum: 0.85,
     pattern: "purchase_hesitation_cluster"
   }

3. Intent Parser:
   Intent {
     type: "purchase_hesitation",
     confidence: 0.87,
     subIntent: "picky_eating",
     recommendedScene: "palatability_demo",
     conversionProbability: "high"
   }

4. Runtime Decision:
   Actions [
     { type: "scene_switch", target: "palatability_demo" },
     { type: "overlay_show", target: "picky_eating_badge" },
     { type: "auto_reply", text: "我家这只以前也挑..." },
     { type: "product_highlight", sku: "cat_food_001" }
   ]

5. SceneGraph Validation:
   ✓ Scene exists
   ✓ Transition allowed from current scene
   ✓ Resources available

6. OBS Execution:
   - Switch to "palatability_demo" scene
   - Show "适口性好" overlay
   - Trigger TTS response

7. Metrics Collection:
   - Track attention curve after change
   - Monitor conversion rate
   - Record user feedback

8. Optimizer:
   - Calculate impact: Impact(m) = ∫ [A(t) - A_prior(t)] * kernel dt
   - If positive: reinforce pattern
   - If negative: propose alternative

9. Knowledge Graph:
   - Store pattern: { context, action, outcome }
   - Update statistics
   - Ready for future recommendations
```

---

## 关键设计原则

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

### 4. 用伪造数据先验证

在没有真实抖音数据前：
- 使用 Fake Event Generator 模拟弹幕
- 验证 Attention Bus 聚合逻辑
- 验证 Intent Parser 分类准确性
- 验证 Runtime 决策正确性
- 验证完整闭环

---

## 技术栈选择

### 核心运行时
- **Language**: TypeScript (类型安全 + 运行时灵活性)
- **Runtime**: Node.js (事件驱动天然适合)
- **State Management**: XState (状态机建模)

### Attention Bus
- **Event Stream**: RxJS (响应式编程)
- **State Aggregation**: Custom reducer with time windows

### Intent Parser
- **NLU**: OpenAI GPT-4 / DeepSeek (意图分类)
- **Context**: Sliding window buffer
- **Confidence**: Calibration layer

### SceneGraph
- **Structure**: Directed graph with constraints
- **Validation**: Custom validator
- **Serialization**: JSON schema

### Render Adapter
- **OBS**: obs-websocket-js
- **Mock**: In-memory renderer for testing

### Metrics
- **Storage**: SQLite (local) / TimescaleDB (production)
- **Reconstruction**: Custom Gaussian kernel implementation
- **Visualization**: Grafana dashboards

### Knowledge Graph
- **Storage**: SQLite with indexes
- **Matching**: Cosine similarity on quantized features
- **Statistics**: Welford's algorithm

---

## 实现路线图

### Phase 0: 核心链路验证 (Week 1-2)

**目标**: 验证"事件 → 理解 → 决策 → 执行"闭环

**交付物**:
- Fake Event Generator
- Attention Bus (基础版)
- Intent Parser (规则引擎)
- Runtime (DSL interpreter)
- SceneGraph (基础结构)
- Mock Renderer

**验证方法**:
```bash
# 输入伪造弹幕流
node scripts/fake-event-stream.js --scenario=purchase_hesitation

# 验证输出
# Expected: Scene switch to palatability_demo
# Expected: Overlay show "适口性好"
# Expected: Auto reply triggered
```

### Phase 1: OBS 集成 (Week 3-4)

**目标**: 接入真实渲染层

**交付物**:
- OBS WebSocket Adapter
- Scene configuration schema
- OBS scene templates

**验证方法**:
```bash
# 启动 OBS
# 运行测试
node scripts/test-obs-integration.js

# 验证 OBS 场景切换
# 验证贴片显示
# 验证文字更新
```

### Phase 2: 抖音数据接入 (Week 5-6)

**目标**: 接入真实数据源

**交付物**:
- Douyin API Adapter
- Event normalizer
- Data quality validator

**验证方法**:
```bash
# 连接真实直播间
node scripts/douyin-adapter.js --roomId=xxx

# 验证事件流
# 验证 Attention Reconstruction
# 验证实时响应
```

### Phase 3: 优化闭环 (Week 7-8)

**目标**: 实现 Mutation 和 Knowledge Graph

**交付物**:
- Optimizer with impact analysis
- Invariant Gate
- Stability Gate
- Convergence Controller
- Knowledge Graph (基础版)

**验证方法**:
```bash
# 运行优化循环
node scripts/optimizer-loop.js --duration=3600

# 验证 mutation 影响
# 验证知识图谱积累
# 验证策略推荐
```

### Phase 4: 生产就绪 (Week 9-10)

**目标**: 稳定性、监控、部署

**交付物**:
- Error handling & recovery
- Monitoring dashboards
- Deployment scripts
- Documentation

---

## 关键接口定义

### AttentionState

```typescript
interface AttentionState {
  // 注意力密度 (0-1)
  density: number;

  // 注意力动量 (变化趋势)
  momentum: number;

  // 当前热点话题
  topic: string | null;

  // 模式识别
  pattern: AttentionPattern;

  // 时间戳
  timestamp: number;
}

type AttentionPattern =
  | "engagement_high"      // 高互动
  | "purchase_hesitation"  // 购买犹豫
  | "drop_risk"           // 流失风险
  | "curiosity_peak"      // 好奇心高峰
  | "boredom"             // 无聊
  | "confusion";          // 困惑
```

### Intent

```typescript
interface Intent {
  // 意图类型
  type: IntentType;

  // 置信度 (0-1)
  confidence: number;

  // 子意图
  subIntent?: string;

  // 推荐场景
  recommendedScene?: string;

  // 转化概率
  conversionProbability?: "low" | "medium" | "high";

  // 原始文本
  sourceText: string;

  // 上下文
  context: {
    recentComments: string[];
    attentionState: AttentionState;
    sessionDuration: number;
  };
}

type IntentType =
  | "product_inquiry"      // 产品咨询
  | "purchase_hesitation"  // 购买犹豫
  | "price_sensitivity"    // 价格敏感
  | "comparison"           // 对比竞品
  | "objection"            // 异议
  | "readiness_signal"     // 购买信号
  | "general_chat";        // 闲聊
```

### RuntimeDecision

```typescript
interface RuntimeDecision {
  // 决策 ID
  decisionId: string;

  // 触发意图
  triggerIntent: Intent;

  // 动作列表
  actions: Action[];

  // 决策依据
  reasoning: string;

  // 预期影响
  expectedImpact: {
    attention: number;
    conversion: number;
  };

  // 时间戳
  timestamp: number;
}

type Action =
  | { type: "scene_switch"; target: string; transition?: string }
  | { type: "overlay_show"; target: string; duration?: number }
  | { type: "overlay_hide"; target: string }
  | { type: "auto_reply"; text: string; voice?: boolean }
  | { type: "product_highlight"; sku: string }
  | { type: "text_update"; element: string; content: string };
```

### Mutation

```typescript
interface Mutation {
  // Mutation ID
  mutationId: string;

  // Mutation 类型
  type: MutationType;

  // 变更内容
  change: Record<string, any>;

  // 提议来源
  proposer: "optimizer" | "knowledge_graph" | "manual";

  // 预期影响
  expectedImpact: number;

  // 置信度
  confidence: number;

  // 时间戳
  timestamp: number;
}

type MutationType =
  | "scene_duration"       // 场景时长
  | "overlay_timing"       // 贴片时机
  | "transition_speed"     // 转场速度
  | "text_content"         // 文字内容
  | "scene_order"          // 场景顺序
  | "response_template";   // 回复模板
```

---

## 成功指标

### Phase 0 验证成功标准

1. **事件处理延迟**: < 100ms (从事件到决策)
2. **意图分类准确率**: > 85% (在测试集上)
3. **闭环完整性**: 100% (事件 → 执行 → 记录)
4. **Mock 渲染正确性**: 100% (与预期一致)

### Phase 1 验证成功标准

1. **OBS 响应延迟**: < 200ms (从指令到画面变化)
2. **场景切换成功率**: > 99%
3. **贴片显示准确性**: 100%

### Phase 2 验证成功标准

1. **事件捕获率**: > 95%
2. **数据质量**: > 90% 有效事件
3. **Attention Reconstruction 误差**: < 10%

### Phase 3 验证成功标准

1. **Mutation 正向影响率**: > 60%
2. **知识图谱命中率**: > 40%
3. **收敛时间**: < 50 cycles

---

## 风险与缓解

### 风险 1: 抖音 API 不稳定

**缓解**:
- 使用多数据源 (官方 API + 第三方 + 爬虫)
- 本地缓存 + 重试机制
- Mock 数据回退

### 风险 2: 意图分类不准确

**缓解**:
- 规则引擎兜底
- 人工审核机制
- 持续训练优化

### 风险 3: OBS 连接断开

**缓解**:
- 心跳检测 + 自动重连
- 降级到 Mock 渲染
- 告警通知

### 风险 4: Mutation 导致表现下降

**缓解**:
- 小步快跑 (step size ≤ 0.3)
- 快速回滚机制
- A/B 测试

---

## 下一步行动

1. **创建项目结构**
   ```
   livestream-os/
   ├── src/
   │   ├── attention-bus/
   │   ├── intent-parser/
   │   ├── runtime/
   │   ├── scene-graph/
   │   ├── render-adapter/
   │   ├── metrics/
   │   ├── optimizer/
   │   ├── safety-gates/
   │   └── knowledge-graph/
   ├── tests/
   ├── scripts/
   └── docs/
   ```

2. **实现 Phase 0 核心模块**
   - Fake Event Generator
   - Attention Bus (基础版)
   - Intent Parser (规则引擎)
   - Runtime (DSL interpreter)
   - SceneGraph (基础结构)
   - Mock Renderer

3. **编写验证脚本**
   - 端到端测试
   - 性能基准测试
   - 回归测试

---

## 参考资源

- [OBS WebSocket Protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)
- [Streamer.bot](https://streamer.bot/) - 直播自动化工作流参考
- [BarrageGPT](https://www.sourcepulse.org/projects/22882678) - 弹幕 AI 交互参考
- [XState](https://xstate.js.org/) - 状态机建模
- [RxJS](https://rxjs.dev/) - 响应式编程
