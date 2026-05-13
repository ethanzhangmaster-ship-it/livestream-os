# 抖音数据接入指南

本文档说明如何接入抖音开放平台的直播数据。

## 前置条件

1. 已注册抖音开放平台账号
2. 已创建移动应用
3. 已获得 Client Key 和 Client Secret
4. 已申请"直播小玩法"能力

## 配置步骤

### 1. 创建 `.env` 文件

在项目根目录创建 `.env` 文件，填入你的抖音 API 凭证：

```env
# OBS WebSocket 配置
OBS_HOST=localhost
OBS_PORT=4455
OBS_PASSWORD=your_obs_password

# 抖音 API 配置
DOUYIN_API_KEY=你的ClientKey
DOUYIN_API_SECRET=你的ClientSecret
DOUYIN_ROOM_ID=你的直播间ID

# 抖音回调配置
DOUYIN_CALLBACK_PORT=3000
DOUYIN_CALLBACK_PATH=/live_data_callback

# 数据模式
USE_FAKE_DATA=false

# 监控配置
DASHBOARD_PORT=8080

# 日志级别
LOG_LEVEL=info
```

### 2. 申请直播小玩法能力

1. 登录抖音开放平台控制台
2. 进入你的应用详情页
3. 在左侧导航栏选择「能力」>「互动数据」
4. 申请开通「直播间评论互动数据」

### 3. 配置回调地址

在抖音开放平台配置回调地址：

```
http://你的服务器IP:3000/live_data_callback
```

**注意**：
- 回调地址必须是公网可访问的 HTTP 地址
- 如果使用抖音云服务，可以使用内网专线，无需域名备案
- 如果使用自己的服务器，需要域名备案

### 4. 启动系统

```bash
npm run start
```

系统会启动抖音数据适配器，监听端口 3000。

## 数据流程

```
抖音直播 → 抖音服务器 → HTTP 回调 → DouyinAdapter → AttentionBus → Runtime → OBS
```

## 支持的事件类型

### 1. 评论事件 (live_comment)

```json
{
  "msg_id": "xxx",
  "content": "这个产品多少钱？",
  "user": {
    "open_id": "user_xxx",
    "nickname": "用户昵称",
    "avatar_url": "https://..."
  },
  "timestamp": 1234567890
}
```

### 2. 点赞事件 (live_like)

```json
{
  "msg_id": "xxx",
  "user": {
    "open_id": "user_xxx",
    "nickname": "用户昵称",
    "avatar_url": "https://..."
  },
  "count": 1,
  "timestamp": 1234567890
}
```

### 3. 礼物事件 (live_gift)

```json
{
  "msg_id": "xxx",
  "user": {
    "open_id": "user_xxx",
    "nickname": "用户昵称",
    "avatar_url": "https://..."
  },
  "gift_id": "gift_xxx",
  "gift_name": "火箭",
  "gift_count": 1,
  "diamond_count": 100,
  "timestamp": 1234567890
}
```

### 4. 粉丝团事件 (live_fansclub)

暂不支持，后续会添加。

## 测试

### 1. 使用抖音云测试工具

抖音开放平台提供了测试工具，可以模拟发送直播数据：

1. 进入抖音开放平台控制台
2. 选择你的应用
3. 点击「测试工具」
4. 选择「直播小玩法测试」
5. 发送测试数据

### 2. 使用 curl 测试

```bash
# 测试评论事件
curl -X POST http://localhost:3000/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_comment" \
  -H "x-anchor-openid: anchor_xxx" \
  -d '[{
    "msg_id": "test_001",
    "content": "这个产品多少钱？",
    "user": {
      "open_id": "user_001",
      "nickname": "测试用户",
      "avatar_url": "https://..."
    },
    "timestamp": 1234567890
  }]'

# 测试点赞事件
curl -X POST http://localhost:3000/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_like" \
  -H "x-anchor-openid: anchor_xxx" \
  -d '[{
    "msg_id": "test_002",
    "user": {
      "open_id": "user_001",
      "nickname": "测试用户",
      "avatar_url": "https://..."
    },
    "count": 1,
    "timestamp": 1234567890
  }]'

# 测试礼物事件
curl -X POST http://localhost:3000/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_gift" \
  -H "x-anchor-openid: anchor_xxx" \
  -d '[{
    "msg_id": "test_003",
    "user": {
      "open_id": "user_001",
      "nickname": "测试用户",
      "avatar_url": "https://..."
    },
    "gift_id": "gift_001",
    "gift_name": "火箭",
    "gift_count": 1,
    "diamond_count": 100,
    "timestamp": 1234567890
  }]'
```

## 常见问题

### 1. 回调地址无法访问

**原因**：
- 服务器防火墙阻止了端口
- 域名未备案
- IP 地址错误

**解决方案**：
- 检查防火墙设置，开放端口 3000
- 使用抖音云服务，无需域名备案
- 确认服务器公网 IP 地址

### 2. 收不到数据

**原因**：
- 未开启推送任务
- 回调地址配置错误
- 应用权限不足

**解决方案**：
- 检查抖音开放平台是否已开启推送任务
- 确认回调地址配置正确
- 检查应用是否有直播小玩法权限

### 3. 数据格式错误

**原因**：
- API 版本不匹配
- 数据字段缺失

**解决方案**：
- 检查抖音开放平台 API 文档
- 查看日志中的错误信息
- 更新适配器代码

## 抖音云服务（推荐）

抖音云服务提供了以下优势：

1. **免域名备案**：使用内网专线，无需域名备案
2. **免鉴权**：调用 OpenAPI 无需 access_token
3. **低延迟**：内网专线，延迟降低 60%
4. **高可靠**：失败率降低 90%
5. **弹性扩缩容**：根据流量自动扩缩容

### 抖音云接入步骤

1. 登录抖音云控制台
2. 创建服务（容器服务或函数服务）
3. 配置抖音回调地址（使用内网专线）
4. 部署代码
5. 测试验证

详细文档：https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide

## 参考资料

- [抖音开放平台文档](https://developer.open-douyin.com/)
- [直播小玩法接入指南](https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide)
- [直播间评论互动数据](https://developer.open-douyin.com/docs/resource/zh-CN/interaction/introduction/capabilities/jierushuoming/hudongshuju/pinglunshuju)
