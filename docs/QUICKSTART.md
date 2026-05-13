# 快速启动指南

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要参数：

```bash
# OBS WebSocket 配置
OBS_HOST=localhost
OBS_PORT=4455
OBS_PASSWORD=your_obs_password

# 数据模式（开发阶段使用模拟数据）
USE_FAKE_DATA=true

# 监控配置
DASHBOARD_PORT=8080
```

## 3. 准备 OBS

### 3.1 安装 OBS Studio

下载并安装：https://obsproject.com/

### 3.2 安装 obs-websocket 插件

OBS 28+ 已内置 WebSocket，无需额外安装。

### 3.3 配置 WebSocket

1. 打开 OBS
2. 菜单：工具 → WebSocket 服务器设置
3. 启用 WebSocket 服务器
4. 设置端口：4455
5. 设置密码（可选）

### 3.4 创建场景

创建以下场景（或自定义）：

- 开场欢迎
- 产品展示
- 优惠活动
- 喂食演示

## 4. 启动系统

```bash
npm run start
```

## 5. 访问监控仪表板

打开浏览器访问：

```
http://localhost:8080
```

## 6. 验证系统运行

### 6.1 检查日志

系统启动后会显示：

```
========================================
Livestream OS 启动完成 ✓
========================================

监控仪表板: http://localhost:8080
数据模式: 模拟数据

按 Ctrl+C 停止系统
```

### 6.2 检查 OBS 连接

如果 OBS 连接成功，日志会显示：

```
[LivestreamOS] OBS 连接成功
```

### 6.3 检查事件流

系统会自动生成模拟事件，日志会显示：

```
[Action] scene_switch ✓ { type: 'scene_switch', target: 'product_display' }
```

## 7. 测试功能

### 7.1 测试场景切换

模拟数据会自动触发场景切换，观察 OBS 场景是否自动切换。

### 7.2 测试监控

访问监控仪表板，查看实时指标：

- 性能指标
- 业务指标
- 系统状态

### 7.3 测试录像/推流

```bash
npm run test-obs-recording
```

## 8. 停止系统

按 `Ctrl+C` 优雅关闭系统。

## 故障排查

### OBS 连接失败

**症状**：`OBS 连接失败，使用 Mock 渲染器`

**解决方案**：
1. 确保 OBS 正在运行
2. 检查 WebSocket 配置（端口、密码）
3. 检查防火墙设置

### 端口被占用

**症状**：`Port 8080 is already in use`

**解决方案**：
修改 `.env` 中的 `DASHBOARD_PORT`

### 模块加载失败

**症状**：`Cannot find module 'xxx'`

**解决方案**：
```bash
npm install
```

## 下一步

- [接入真实抖音数据](./DEPLOYMENT.md#抖音数据接入)
- [自定义场景配置](./DEPLOYMENT.md#场景配置)
- [性能调优](./DEPLOYMENT.md#性能优化)
