# OBS 配置指南

## 1. 安装 OBS Studio

### Windows
1. 下载 OBS Studio：https://obsproject.com/download
2. 运行安装程序
3. 按默认设置安装

### macOS
```bash
brew install --cask obs
```

### Linux
```bash
sudo apt install obs-studio
```

## 2. 安装 OBS WebSocket 插件

### OBS Studio 28+ (内置 WebSocket)

OBS Studio 28 及以上版本已内置 WebSocket 插件，无需额外安装。

### OBS Studio 27 及以下版本

1. 下载 OBS WebSocket 插件：https://github.com/obsproject/obs-websocket/releases
2. 运行安装程序
3. 重启 OBS

## 3. 配置 OBS WebSocket

### 启用 WebSocket 服务器

1. 打开 OBS Studio
2. 进入菜单：**工具** → **WebSocket 服务器设置**
3. 勾选 **启用 WebSocket 服务器**
4. 设置端口：**4455**（默认）
5. 设置密码：留空或设置密码
6. 点击 **确定**

### 验证 WebSocket 连接

**方法 1：使用测试脚本**

```bash
npm run test-obs
```

**方法 2：使用浏览器**

打开浏览器访问：http://localhost:4455

如果返回错误页面，说明 WebSocket 服务器正在运行。

## 4. 创建 OBS 场景

LivestreamOS 会根据观众注意力自动切换场景。建议创建以下场景：

### 推荐场景配置

| 场景名称 | 用途 | 触发条件 |
|---------|------|---------|
| `hook` | 开场钩子场景 | 直播开始、注意力下降 |
| `narration` | 产品讲解场景 | 正常讲解、中等注意力 |
| `stats` | 数据展示场景 | 高注意力、产品数据 |
| `cta` | 行动号召场景 | 购买信号、高转化概率 |
| `qa` | 问答场景 | 观众提问、互动 |
| `idle` | 待机场景 | 无观众、低注意力 |

### 创建场景步骤

1. 在 OBS 左下角 **场景** 区域
2. 点击 **+** 按钮
3. 输入场景名称（如 `hook`）
4. 点击 **确定**
5. 在 **源** 区域添加视频/图片源

## 5. 配置场景源

### 场景源类型

- **媒体源**：视频文件、图片
- **文本源**：文字显示
- **图像源**：静态图片
- **浏览器源**：网页内容
- **窗口采集**：采集特定窗口
- **显示器采集**：采集整个屏幕

### 示例：创建产品讲解场景

1. 创建场景：`narration`
2. 添加源：
   - **视频采集设备**：摄像头
   - **图像源**：产品图片
   - **文本源**：产品名称、价格

## 6. 测试场景切换

### 使用测试脚本

```bash
# 测试 OBS 连接
npm run test-obs

# 测试场景切换
npm run test-obs-integration
```

### 手动测试

1. 启动 LivestreamOS：
   ```bash
   npm run start
   ```

2. 发送测试评论：
   ```bash
   curl -X POST http://localhost:3000/live_data_callback \
     -H "Content-Type: application/json" \
     -H "x-msg-type: live_comment" \
     -d '[{"msg_id":"test_001","content":"这个产品多少钱？","user":{"open_id":"user_001","nickname":"测试用户"},"timestamp":1234567890}]'
   ```

3. 观察 OBS 是否自动切换场景

## 7. 场景切换规则

LivestreamOS 会根据以下因素自动切换场景：

### 注意力状态

- **高注意力** → `stats` 或 `cta` 场景
- **中等注意力** → `narration` 场景
- **低注意力** → `hook` 场景

### 观众意图

- **产品咨询** → `narration` 场景
- **购买犹豫** → `cta` 场景
- **价格敏感** → `stats` 场景
- **问答** → `qa` 场景

### 会话阶段

- **早期**（< 5 分钟）→ `hook` 场景
- **中期**（5-30 分钟）→ `narration` 场景
- **后期**（> 30 分钟）→ `cta` 场景

## 8. 常见问题

### Q: OBS 连接失败怎么办？

**A:** 检查以下几点：
1. OBS 是否正在运行？
2. WebSocket 服务器是否启用？
3. 端口号是否正确？（默认 4455）
4. 防火墙是否阻止连接？

### Q: 场景切换不生效？

**A:** 检查以下几点：
1. 场景名称是否正确？（必须完全匹配）
2. OBS 场景是否存在？
3. 查看 LivestreamOS 日志是否有错误

### Q: 如何查看实时注意力数据？

**A:** 访问监控仪表板：
```
http://localhost:8080
```

### Q: 如何调整场景切换灵敏度？

**A:** 修改配置文件中的阈值：
- `HOOK_DURATION_MAX`: 钩子场景最大时长
- `AVG_ATTENTION_MIN`: 平均注意力最低阈值
- `DROP_RISK_MAX`: 流失风险最高阈值

## 9. 高级配置

### 自定义场景切换规则

编辑 `src/runtime/engine.ts` 文件，修改决策规则：

```typescript
// 示例：添加自定义规则
if (attentionState.density > 0.8 && intent.type === 'purchase_hesitation') {
  return { action: 'switch_scene', scene: 'cta' };
}
```

### 添加场景特效

在 OBS 中配置场景切换特效：
1. 进入 **设置** → **场景过渡**
2. 设置过渡类型和时长
3. LivestreamOS 会自动应用这些特效

### 多机位配置

如果使用多台摄像机：
1. 在 OBS 中创建多个场景
2. 每个场景对应一个机位
3. LivestreamOS 会根据注意力自动切换机位

## 10. 性能优化

### 降低延迟

1. 使用有线网络连接
2. 关闭不必要的 OBS 源
3. 降低视频分辨率
4. 使用硬件编码器

### 提高稳定性

1. 增加 OBS 缓冲区大小
2. 使用 SSD 存储视频文件
3. 关闭后台应用程序
4. 定期重启 OBS

## 11. 相关文档

- [OBS 官方文档](https://obsproject.com/wiki/)
- [OBS WebSocket 文档](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)
- [抖音事件订阅指南](./DOUYIN_EVENT_SUBSCRIPTION.md)
- [API 文档](./API.md)

## 12. 下一步

1. ✅ 安装并配置 OBS
2. ✅ 创建场景和源
3. ✅ 测试场景切换
4. ⏳ 开始直播测试
5. ⏳ 调整场景切换规则
6. ⏳ 监控注意力数据

---

**提示**：建议先用测试数据验证场景切换功能，确认正常后再接入真实直播数据。
