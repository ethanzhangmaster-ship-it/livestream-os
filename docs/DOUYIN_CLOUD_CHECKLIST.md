# 抖音云部署检查清单

在部署到抖音云之前，请确保完成以下所有步骤。

## ✅ 前置准备

### 1. 抖音开放平台配置

- [ ] 已创建应用（应用名称：鹦鹉粮）
- [ ] 已获取 Client Key：`aww36rpeq413jv0c`
- [ ] 已获取 Client Secret：`c45716df69c2ed1e7a2093ee2ced4bf8`
- [ ] 已配置应用平台（Android/iOS）
- [ ] 已申请相关权限（直播数据推送）

### 2. 抖音云服务

- [ ] 已开通抖音云服务
- [ ] 已安装抖音云 CLI（可选，推荐）
- [ ] 已创建命名空间
- [ ] 已获取镜像仓库地址

### 3. 本地环境

- [ ] 已安装 Docker
- [ ] 已安装 Node.js 18+
- [ ] 已安装 npm 或 yarn
- [ ] 已配置 OBS WebSocket（如需控制 OBS）

---

## 🔧 配置准备

### 1. 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```env
# OBS WebSocket 配置
OBS_HOST=你的本地IP
OBS_PORT=4455
OBS_PASSWORD=your_obs_password

# 抖音 API 配置
DOUYIN_API_KEY=aww36rpeq413jv0c
DOUYIN_API_SECRET=c45716df69c2ed1e7a2093ee2ced4bf8
DOUYIN_ROOM_ID=你的直播间ID

# 数据模式
USE_FAKE_DATA=false

# 监控配置
DASHBOARD_PORT=8080

# 日志级别
LOG_LEVEL=info
```

### 2. OBS 配置（如需控制 OBS）

- [ ] 已安装 OBS Studio
- [ ] 已安装 obs-websocket 插件
- [ ] 已配置 WebSocket 端口（默认 4455）
- [ ] 已配置 WebSocket 密码
- [ ] 已测试 WebSocket 连接

### 3. 抖音云配置

更新 `douyin-cloud.yaml` 中的配置：

- [ ] `obs-host`: 你的本地 IP
- [ ] `obs-port`: OBS WebSocket 端口
- [ ] `obs-password`: OBS WebSocket 密码
- [ ] `douyin-room-id`: 你的直播间 ID

---

## 🚀 部署步骤

### 1. 本地测试

```bash
# 安装依赖
npm install

# 构建
npm run build

# 本地测试
npm run start

# 测试 OBS 连接（如需）
npm run test-obs

# 测试抖音数据接入（使用伪造数据）
USE_FAKE_DATA=true npm run start
```

- [ ] 本地测试通过
- [ ] OBS 连接正常（如需）
- [ ] 伪造数据测试通过

### 2. 构建 Docker 镜像

```bash
# 设置环境变量
export DOCKER_REGISTRY=registry.douyin-cloud.com
export NAMESPACE=your-namespace
export IMAGE_NAME=livestream-os
export IMAGE_TAG=latest

# 构建镜像
./scripts/douyin-cloud-deploy.sh build
```

- [ ] 镜像构建成功

### 3. 推送镜像到抖音云

```bash
# 登录镜像仓库
./scripts/douyin-cloud-deploy.sh login

# 推送镜像
./scripts/douyin-cloud-deploy.sh push
```

- [ ] 镜像推送成功

### 4. 部署到抖音云

```bash
# 部署应用
./scripts/douyin-cloud-deploy.sh deploy

# 查看状态
./scripts/douyin-cloud-deploy.sh status

# 查看日志
./scripts/douyin-cloud-deploy.sh logs
```

- [ ] 部署成功
- [ ] Pod 运行正常
- [ ] 服务启动正常

### 5. 获取内网地址

```bash
# 获取内网回调地址
./scripts/douyin-cloud-deploy.sh url
```

- [ ] 已获取内网地址
- [ ] 记录内网地址：`http://<ClusterIP>:3000/live_data_callback`

---

## 📝 抖音开放平台配置

### 1. 配置 Webhook

1. 登录抖音开放平台
2. 进入应用详情页
3. 点击「开发设置」→「Webhooks」
4. 点击「添加」
5. 填写内网地址：`http://<ClusterIP>:3000/live_data_callback`
6. 勾选订阅事件：
   - [ ] live_comment（评论）
   - [ ] live_like（点赞）
   - [ ] live_gift（礼物）
   - [ ] live_fansclub（粉丝团）
7. 保存

- [ ] Webhook 配置成功

### 2. 申请上线转正

1. 在应用详情页点击「申请上线转正」
2. 填写应用信息
3. 提交审核

- [ ] 已申请上线转正
- [ ] 审核通过

---

## 🧪 验证测试

### 1. 健康检查

```bash
# 访问健康检查端点
curl http://<ClusterIP>:8080/api/health
```

- [ ] 健康检查通过

### 2. 监控仪表板

访问监控仪表板：`http://<ClusterIP>:8080`

- [ ] 仪表板可访问
- [ ] 指标显示正常

### 3. 抖音数据接入测试

1. 开启抖音直播
2. 在直播间发送评论、点赞、礼物
3. 检查应用日志是否收到事件

```bash
# 查看日志
./scripts/douyin-cloud-deploy.sh logs
```

- [ ] 收到评论事件
- [ ] 收到点赞事件
- [ ] 收到礼物事件

### 4. OBS 控制测试（如需）

1. 在直播间触发特定事件
2. 检查 OBS 是否自动切换场景

- [ ] OBS 场景切换正常
- [ ] 贴片显示正常

---

## 🔍 故障排查

### 问题 1：镜像推送失败

**可能原因**：
- 未登录镜像仓库
- 镜像仓库地址错误
- 权限不足

**解决方案**：
```bash
# 重新登录
docker login registry.douyin-cloud.com

# 检查镜像仓库地址
echo $DOCKER_REGISTRY
```

### 问题 2：部署失败

**可能原因**：
- 镜像不存在
- 配置错误
- 资源不足

**解决方案**：
```bash
# 查看部署状态
douyin-cloud kubectl describe deployment livestream-os

# 查看 Pod 日志
douyin-cloud kubectl logs deployment/livestream-os
```

### 问题 3：Webhook 配置失败

**可能原因**：
- 内网地址格式错误
- 服务未启动
- 端口未开放

**解决方案**：
```bash
# 检查服务状态
douyin-cloud kubectl get service livestream-os

# 检查端口
douyin-cloud kubectl get endpoints livestream-os
```

### 问题 4：未收到抖音事件

**可能原因**：
- Webhook 未配置
- 应用未上线
- 权限未申请

**解决方案**：
1. 检查抖音开放平台 Webhook 配置
2. 检查应用状态（是否已上线）
3. 检查权限申请状态

---

## 📚 相关文档

- [抖音云部署指南](./DOUYIN_CLOUD_DEPLOYMENT.md)
- [抖音数据接入文档](./DOUYIN_INTEGRATION.md)
- [API 文档](./API.md)
- [部署指南](./DEPLOYMENT.md)

---

## 🎉 完成

完成以上所有步骤后，你的 Livestream OS 就成功部署到抖音云了！

**下一步**：
1. 监控应用运行状态
2. 优化配置参数
3. 根据实际数据调整策略
