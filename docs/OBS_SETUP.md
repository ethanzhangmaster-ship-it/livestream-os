# OBS 配置指南

本文档说明如何配置 OBS Studio 以配合 Livestream OS 使用。

## 前置要求

- OBS Studio ≥ 28.0.0 (已内置 WebSocket 支持)
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0

## 步骤 1: 启用 WebSocket 服务器

1. 打开 OBS Studio
2. 点击菜单栏 **工具** → **obs-websocket 设置**
3. 勾选 **启用 WebSocket 服务器**
4. 端口保持默认 `4455` (或自定义)
5. 点击 **显示连接信息** 查看密码
6. 点击 **应用**

## 步骤 2: 创建场景

Livestream OS 需要以下场景：

### 必需场景

| 场景名称 | 用途 | 建议内容 |
|---------|------|---------|
| `hook` | 开场场景 | 欢迎画面、互动提示 |
| `palatability_demo` | 适口性演示 | 试吃视频、产品展示 |
| `price_promotion` | 价格促销 | 优惠信息、价格对比 |
| `checkout_guide` | 下单引导 | 购买链接、二维码 |

### 可选场景

| 场景名称 | 用途 |
|---------|------|
| `interactive_hook` | 互动场景 |
| `objection_handling` | 异议处理 |
| `product_comparison` | 产品对比 |
| `product_intro` | 产品介绍 |

### 创建场景步骤

1. 在 OBS **场景** 面板点击 **+** 按钮
2. 输入场景名称 (例如: `hook`)
3. 点击 **确定**
4. 重复以上步骤创建所有场景

## 步骤 3: 创建源

每个场景需要特定的源。

### 通用源 (所有场景)

| 源名称 | 类型 | 用途 |
|-------|------|------|
| `test_text` | 文本 (GDI+) | 测试文字更新功能 |

### hook 场景

| 源名称 | 类型 | 用途 |
|-------|------|------|
| `hook_text` | 文本 (GDI+) | 开场文字 |
| `interaction_prompt` | 图像/浏览器 | 互动提示 |

### palatability_demo 场景

| 源名称 | 类型 | 用途 |
|-------|------|------|
| `picky_eating_badge` | 图像 | 挑食徽章贴片 |
| `eating_video` | 媒体源 | 试吃视频 |
| `product_cat_food_001` | 图像/浏览器 | 产品卡片 |

### price_promotion 场景

| 源名称 | 类型 | 用途 |
|-------|------|------|
| `discount_badge` | 图像 | 优惠徽章贴片 |
| `buy_button` | 图像/浏览器 | 购买按钮 |

### checkout_guide 场景

| 源名称 | 类型 | 用途 |
|-------|------|------|
| `buy_button` | 图像/浏览器 | 购买按钮 |
| `qr_code` | 图像 | 二维码 |

### 创建源步骤

1. 在 **源** 面板点击 **+** 按钮
2. 选择源类型 (例如: **文本 (GDI+)**)
3. 输入源名称 (例如: `test_text`)
4. 配置源属性
5. 点击 **确定**
6. 在 **场景** 面板切换到目标场景
7. 在 **源** 面板右键点击源 → **复制**
8. 切换到其他场景 → **粘贴** (引用)

## 步骤 4: 测试连接

运行连接测试：

```bash
npm run test-obs
```

预期输出：

```
========================================
OBS WebSocket 连接测试
========================================

1. 测试连接...
✓ 连接成功
  OBS 版本: 32.1.0
  WebSocket 版本: 5.5.0

2. 测试获取场景列表...
✓ 找到 4 个场景:
  1. hook
  2. palatability_demo
  3. price_promotion
  4. checkout_guide

3. 测试获取当前场景...
✓ 当前场景: hook

...
```

## 步骤 5: 测试完整集成

运行完整集成测试：

```bash
npm run test-obs-integration
```

这将模拟完整的直播流程：

1. 生成伪造事件 (弹幕、点赞等)
2. Attention Bus 计算注意力状态
3. Intent Parser 解析用户意图
4. Runtime Engine 做出决策
5. SceneGraph 验证动作合法性
6. OBS Adapter 执行渲染动作

预期效果：

- OBS 场景自动切换
- 贴片自动显示/隐藏
- 文字自动更新

## 常见问题

### Q: 连接失败怎么办？

**A**: 检查以下几点：

1. OBS 是否已启动？
2. WebSocket 服务器是否已启用？
3. 端口号是否正确？(默认 4455)
4. 密码是否正确？
5. 防火墙是否阻止连接？

### Q: 场景切换失败？

**A**: 检查以下几点：

1. 场景名称是否正确？(区分大小写)
2. 场景是否已创建？
3. OBS 是否处于录制/推流状态？(某些操作可能受限)

### Q: 贴片显示失败？

**A**: 检查以下几点：

1. 源名称是否正确？(区分大小写)
2. 源是否已添加到当前场景？
3. 源是否被隐藏？(检查眼睛图标)

### Q: 文字更新失败？

**A**: 检查以下几点：

1. 文字源名称是否正确？
2. 文字源是否是 **文本 (GDI+)** 类型？
3. 文字源是否已添加到当前场景？

## 高级配置

### 自定义 OBS 连接参数

在代码中自定义连接参数：

```typescript
import { OBSAdapter } from 'livestream-os';

const obs = new OBSAdapter({
  host: '192.168.1.100', // 远程 OBS
  port: 4456,            // 自定义端口
  password: 'your_password',
  autoReconnect: true,   // 自动重连
  reconnectInterval: 5000, // 重连间隔 (ms)
});
```

### 创建自定义场景

在 `src/scene-graph/index.ts` 中添加自定义场景：

```typescript
const DEFAULT_SCENES: SceneNode[] = [
  // ... 现有场景
  {
    id: 'custom_scene',
    name: '自定义场景',
    type: 'demo',
    duration: 15000,
    overlays: ['custom_overlay'],
    products: ['custom_product'],
  },
];
```

### 创建自定义转换规则

在 `src/scene-graph/index.ts` 中添加自定义转换：

```typescript
const DEFAULT_TRANSITIONS: SceneTransition[] = [
  // ... 现有转换
  { from: 'hook', to: 'custom_scene', priority: 5 },
  { from: 'custom_scene', to: 'checkout_guide', priority: 8 },
];
```

## 下一步

- 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解系统架构
- 运行 `npm run validate-loop` 验证完整闭环
- 查看 [README.md](./README.md) 了解更多功能
