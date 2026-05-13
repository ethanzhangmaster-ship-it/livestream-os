# 抖音云快速部署指南

## 第一步：配置应用包信息

访问：https://developer.open-douyin.com/mobileapp/aww36rpeq413jv0c/indexpage

点击「配置应用包信息」→「去完善」

### Android 配置

**包名**：
```
com.parrotfood.livestream
```

**应用签名**：
```
# 如果暂时没有签名，可以先填写测试签名
# 格式：32位MD5，去掉冒号
# 例如：AB12CD34EF56GH78IJ90KL12MN34OP56
```

### iOS 配置

**Bundle ID**：
```
com.parrotfood.livestream
```

## 第二步：配置 Webhook

点击「配置 webhook 请求网址及订阅事件」→「去配置」

### Webhook 请求网址

**抖音云内网地址**（推荐）：
```
http://livestream-os.douyin-cloud.svc.cluster.local:3000/live_data_callback
```

或者使用抖音云提供的域名：
```
https://your-app-id.douyin-cloud.com/live_data_callback
```

### 订阅事件

勾选以下事件：
- ✓ 直播间评论（live_comment）
- ✓ 直播间点赞（live_like）
- ✓ 直播间礼物（live_gift）
- ✓ 粉丝团事件（live_fansclub）

## 第三步：申请上线转正

完成前两步后，点击「申请上线转正」

**注意**：应用基础信息审核需要 1-2 个工作日，请耐心等待。

## 第四步：部署到抖音云

### 方案 A：使用抖音云控制台（推荐新手）

1. 登录抖音开放平台控制台
2. 进入「抖音云」服务
3. 创建新服务
   - 服务名称：livestream-os
   - 服务类型：容器服务
   - 运行环境：Node.js 18
4. 上传 Docker 镜像
5. 配置环境变量（见下方）
6. 启动服务

### 方案 B：使用抖音云 CLI（推荐开发者）

```bash
# 1. 安装抖音云 CLI
# 访问：https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide

# 2. 登录
douyin-cloud login

# 3. 构建 Docker 镜像
docker build -t livestream-os:latest .

# 4. 推送到抖音云镜像仓库
docker tag livestream-os:latest registry.douyin-cloud.com/your-namespace/livestream-os:latest
docker push registry.douyin-cloud.com/your-namespace/livestream-os:latest

# 5. 部署服务
douyin-cloud apply -f douyin-cloud.yaml

# 6. 查看服务状态
douyin-cloud get pods
```

## 环境变量配置

在抖音云控制台配置以下环境变量：

### 必需配置

```env
# OBS WebSocket 配置
OBS_HOST=你的本地IP或公网IP
OBS_PORT=4455
OBS_PASSWORD=your_obs_password

# 抖音 API 配置（抖音云免鉴权）
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

### 可选配置

```env
# 抖音回调配置（抖音云自动配置）
DOUYIN_CALLBACK_PORT=3000
DOUYIN_CALLBACK_PATH=/live_data_callback
```

## 第五步：配置 OBS 连接

### 方案 A：使用公网 IP

1. 确保本地有公网 IP
2. 在路由器配置端口转发：
   - 外部端口 4455 → 内部端口 4455
   - 内部 IP：你的电脑 IP
3. 配置环境变量：
   ```env
   OBS_HOST=你的公网IP
   OBS_PORT=4455
   ```

### 方案 B：使用抖音云内网专线

1. 在抖音云控制台配置内网专线
2. 连接你的本地网络
3. 配置环境变量：
   ```env
   OBS_HOST=你的本地内网IP
   OBS_PORT=4455
   ```

### 方案 C：使用 Mock 渲染器（测试）

暂时不连接 OBS，使用 Mock 渲染器测试：

```env
USE_FAKE_DATA=true
```

## 第六步：验证部署

### 1. 查看服务状态

```bash
douyin-cloud get pods

# 输出示例：
# NAME                              READY   STATUS    RESTARTS   AGE
# livestream-os-xxxxxx-xxxx         1/1     Running   0          1m
```

### 2. 查看日志

```bash
douyin-cloud logs -f livestream-os-xxxxxx-xxxx
```

### 3. 测试回调

使用抖音开放平台测试工具：

1. 进入抖音开放平台控制台
2. 选择你的应用
3. 点击「测试工具」
4. 选择「直播小玩法测试」
5. 发送测试评论：\"这个产品多少钱？\"

### 4. 查看监控

访问监控仪表板：
```
http://your-app-id.douyin-cloud.com:8080
```

## 常见问题

### 1. Webhook 配置失败

**原因**：
- 服务未启动
- 回调地址格式错误
- 网络不通

**解决方案**：
- 确认服务已启动
- 使用抖音云内网地址
- 检查抖音云控制台的错误日志

### 2. OBS 连接失败

**原因**：
- OBS_HOST 配置错误
- 网络不通
- 防火墙阻止

**解决方案**：
- 检查 OBS_HOST 是否正确
- 使用公网 IP 或内网专线
- 开放端口 4455

### 3. 应用转正失败

**原因**：
- 应用基础信息未审核通过
- 应用包信息未配置

**解决方案**：
- 等待审核（1-2 工作日）
- 完善应用包信息

## 下一步

1. ✅ 配置应用包信息
2. ✅ 配置 Webhook
3. ✅ 申请上线转正
4. ✅ 部署到抖音云
5. ✅ 配置 OBS 连接
6. ✅ 验证部署

完成以上步骤后，你的 Livestream OS 就可以在抖音云上运行了！

## 需要帮助？

如果遇到问题，请提供以下信息：

1. 错误截图
2. 服务日志（`douyin-cloud logs livestream-os-xxxxxx-xxxx`）
3. 环境变量配置（隐藏敏感信息）

我会帮你快速定位和解决问题。
