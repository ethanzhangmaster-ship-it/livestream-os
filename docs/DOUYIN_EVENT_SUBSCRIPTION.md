# 抖音直播事件订阅指南

## 1. 订阅事件

在抖音开放平台配置 Webhook 后，需要订阅具体的事件类型。

### 支持的事件类型

| 事件中文名称 | 事件英文名称 | 事件描述 |
|------------|------------|---------|
| 评论事件 | `live_comment` | 观众在直播间发送评论 |
| 点赞事件 | `live_like` | 观众点赞直播间 |
| 礼物事件 | `live_gift` | 观众送礼物 |
| 进入直播间 | `live_room_enter` | 观众进入直播间 |
| 离开直播间 | `live_room_exit` | 观众离开直播间 |
| 关注事件 | `follow` | 观众关注主播 |
| 分享事件 | `share` | 观众分享直播间 |

### 订阅步骤

1. 打开抖音开放平台：https://developer.open-douyin.com
2. 进入你的应用"鹦鹉粮"
3. 找到"直播小玩法" → "消息推送" → "订阅事件"
4. 勾选需要订阅的事件类型
5. 点击"保存"

## 2. 测试数据流

### 方法 1：使用测试脚本

```bash
ts-node scripts/test-douyin-webhook.ts
```

### 方法 2：手动测试

#### 测试评论事件

```bash
curl -X POST https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_comment" \
  -d '[{"msg_id":"test_001","content":"这个产品多少钱？","user":{"open_id":"user_001","nickname":"测试用户"},"timestamp":1234567890}]'
```

#### 测试点赞事件

```bash
curl -X POST https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_like" \
  -d '[{"msg_id":"test_002","user":{"open_id":"user_002","nickname":"测试用户"},"count":5,"timestamp":1234567890}]'
```

#### 测试礼物事件

```bash
curl -X POST https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/live_data_callback \
  -H "Content-Type: application/json" \
  -H "x-msg-type: live_gift" \
  -d '[{"msg_id":"test_003","user":{"open_id":"user_003","nickname":"测试用户"},"gift_id":"gift_123","gift_name":"火箭","gift_count":1,"diamond_count":500,"timestamp":1234567890}]'
```

## 3. 查看日志

### 抖音云日志

1. 打开抖音云控制台：https://console.douyincloud.cn/
2. 找到 `livestream-os` 服务
3. 点击"日志"
4. 查看实时日志输出

### 预期日志

```
[Douyin] 收到回调: live_comment [ { msg_id: 'test_001', ... } ]
```

## 4. 数据处理流程

```
抖音直播 → 抖音服务器 → Webhook → LivestreamOS → AttentionBus → Runtime → OBS
```

### 当前状态

- ✅ Webhook 已验证
- ✅ 服务运行正常
- ⏳ 等待订阅事件
- ⏳ 等待真实直播数据

## 5. 下一步

1. **订阅事件**：在抖音开放平台订阅需要的直播事件
2. **开始直播**：使用测试账号开始直播
3. **验证数据**：在抖音云日志中查看实时数据
4. **配置 OBS**：配置 OBS WebSocket 地址（可选）
5. **测试场景切换**：测试自动场景切换功能

## 6. 常见问题

### Q: 为什么没有收到数据？

**A:** 检查以下几点：
1. 是否已在抖音开放平台订阅事件？
2. 是否使用测试账号开始直播？
3. Webhook URL 是否正确？
4. 查看抖音云日志是否有错误

### Q: 如何测试真实直播数据？

**A:** 
1. 使用抖音开放平台的测试工具
2. 或使用真实的抖音账号开始直播
3. 观众互动（评论、点赞、送礼物）会触发事件

### Q: 如何查看监控数据？

**A:** 
- 监控仪表板：`https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/`
- 健康检查：`https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/health`

## 7. 相关文档

- [抖音开放平台文档](https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide)
- [抖音云部署指南](./DOUYIN_CLOUD_DEPLOYMENT.md)
- [API 文档](./API.md)
