# Livestream OS API 文档

## 目录

1. [概述](#概述)
2. [认证](#认证)
3. [端点](#端点)
4. [数据模型](#数据模型)
5. [错误处理](#错误处理)
6. [示例](#示例)

---

## 概述

Livestream OS 提供以下 API 端点：

- **健康检查 API**: 系统健康状态
- **指标 API**: 性能和业务指标
- **告警 API**: 告警管理
- **快照 API**: 历史数据查询

**基础 URL**: `http://localhost:8080`

---

## 认证

当前版本暂无认证机制。生产环境建议添加 API Key 或 JWT 认证。

---

## 端点

### 1. 健康检查

#### GET /api/health

获取系统完整健康状态。

**响应**:

```json
{
  "timestamp": 1234567890,
  "performance": {
    "eventProcessingLatency": 12.5,
    "eventThroughput": 150.2,
    "decisionLatency": 8.3,
    "decisionSuccessRate": 0.95,
    "sceneSwitchLatency": 45.2,
    "sceneSwitchSuccessRate": 0.98,
    "optimizationCycleTime": 1200.5,
    "mutationApprovalRate": 0.35,
    "cpuUsage": 0.45,
    "memoryUsage": 150.2,
    "eventQueueSize": 25
  },
  "business": {
    "avgAttention": 0.65,
    "attentionTrend": "rising",
    "activeUsers": 150,
    "engagementRate": 0.45,
    "conversionRate": 0.12,
    "scenePerformance": {},
    "optimizationImpact": 0.05,
    "knowledgeGraphHitRate": 0.75
  },
  "system": {
    "uptime": 3600,
    "errorRate": 0.001,
    "errorCount": 5,
    "circuitBreakerOpenCount": 0,
    "circuitBreakerStates": {
      "obs-connection": "closed",
      "douyin-adapter": "closed"
    },
    "healthStatus": "healthy",
    "componentHealth": {
      "obs-connection": "healthy",
      "database": "healthy",
      "memory": "healthy"
    },
    "obsConnected": true,
    "douyinConnected": false
  }
}
```

**状态码**:
- `200 OK`: 成功
- `503 Service Unavailable`: 系统不健康

---

### 2. 指标查询

#### GET /api/metrics

获取所有指标数据。

**响应**:

```json
[
  {
    "name": "event_processing_latency",
    "type": "histogram",
    "description": "Event processing latency",
    "unit": "ms",
    "values": [
      {
        "value": 12.5,
        "timestamp": 1234567890,
        "labels": {}
      }
    ]
  }
]
```

**状态码**:
- `200 OK`: 成功

---

### 3. 告警管理

#### GET /api/alerts

获取活动告警和历史记录。

**响应**:

```json
{
  "active": [
    {
      "id": "high_error_rate-1234567890",
      "name": "high_error_rate",
      "severity": "warning",
      "message": "error_rate gt 0.1 (current: 0.15)",
      "timestamp": 1234567890,
      "metric": "error_rate",
      "threshold": 0.1,
      "currentValue": 0.15,
      "labels": {
        "category": "system"
      }
    }
  ],
  "history": [
    // 最近 20 条告警历史
  ],
  "stats": {
    "total": 10,
    "active": 1,
    "bySeverity": {
      "info": 2,
      "warning": 5,
      "error": 2,
      "critical": 1
    }
  }
}
```

**状态码**:
- `200 OK`: 成功

---

### 4. 快照查询

#### GET /api/snapshots

获取历史指标快照。

**查询参数**:
- `limit` (可选): 返回数量，默认 100

**响应**:

```json
[
  {
    "timestamp": 1234567890,
    "performance": { /* ... */ },
    "business": { /* ... */ },
    "system": { /* ... */ }
  }
]
```

**状态码**:
- `200 OK`: 成功

---

## 数据模型

### PerformanceMetrics

| 字段 | 类型 | 描述 |
|------|------|------|
| eventProcessingLatency | number | 事件处理延迟（ms） |
| eventThroughput | number | 事件吞吐量（events/s） |
| decisionLatency | number | 决策延迟（ms） |
| decisionSuccessRate | number | 决策成功率（0-1） |
| sceneSwitchLatency | number | 场景切换延迟（ms） |
| sceneSwitchSuccessRate | number | 场景切换成功率（0-1） |
| optimizationCycleTime | number | 优化周期时间（ms） |
| mutationApprovalRate | number | 变更批准率（0-1） |
| cpuUsage | number | CPU 使用率（0-1） |
| memoryUsage | number | 内存使用（MB） |
| eventQueueSize | number | 事件队列大小 |

### BusinessMetrics

| 字段 | 类型 | 描述 |
|------|------|------|
| avgAttention | number | 平均注意力（0-1） |
| attentionTrend | string | 注意力趋势（rising/stable/falling） |
| activeUsers | number | 活跃用户数 |
| engagementRate | number | 参与率（0-1） |
| conversionRate | number | 转化率（0-1） |
| scenePerformance | Map | 场景性能映射 |
| optimizationImpact | number | 优化影响值 |
| knowledgeGraphHitRate | number | 知识图谱命中率（0-1） |

### SystemMetrics

| 字段 | 类型 | 描述 |
|------|------|------|
| uptime | number | 运行时间（秒） |
| errorRate | number | 错误率（errors/s） |
| errorCount | number | 错误总数 |
| circuitBreakerOpenCount | number | 熔断器打开次数 |
| circuitBreakerStates | Record | 熔断器状态映射 |
| healthStatus | string | 健康状态（healthy/degraded/unhealthy） |
| componentHealth | Record | 组件健康映射 |
| obsConnected | boolean | OBS 连接状态 |
| douyinConnected | boolean | 抖音连接状态 |

### Alert

| 字段 | 类型 | 描述 |
|------|------|------|
| id | string | 告警 ID |
| name | string | 告警名称 |
| severity | string | 严重性（info/warning/error/critical） |
| message | string | 告警消息 |
| timestamp | number | 时间戳 |
| metric | string | 相关指标 |
| threshold | number | 阈值 |
| currentValue | number | 当前值 |
| labels | Record | 标签 |

---

## 错误处理

### 错误响应格式

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred",
    "details": {}
  }
}
```

### 常见错误码

| 状态码 | 错误码 | 描述 |
|--------|--------|------|
| 400 | INVALID_PARAMETER | 参数无效 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

---

## 示例

### cURL

```bash
# 健康检查
curl http://localhost:8080/api/health

# 获取指标
curl http://localhost:8080/api/metrics

# 获取告警
curl http://localhost:8080/api/alerts

# 获取快照
curl http://localhost:8080/api/snapshots?limit=50
```

### JavaScript

```javascript
// 获取健康状态
async function getHealth() {
  const response = await fetch('http://localhost:8080/api/health');
  const data = await response.json();
  console.log('System health:', data.system.healthStatus);
}

// 获取活动告警
async function getActiveAlerts() {
  const response = await fetch('http://localhost:8080/api/alerts');
  const data = await response.json();
  console.log('Active alerts:', data.active.length);
}

// 定期轮询
setInterval(async () => {
  await getHealth();
}, 5000);
```

### Python

```python
import requests
import json

# 获取健康状态
def get_health():
    response = requests.get('http://localhost:8080/api/health')
    data = response.json()
    print(f"System health: {data['system']['healthStatus']}")
    return data

# 获取告警
def get_alerts():
    response = requests.get('http://localhost:8080/api/alerts')
    data = response.json()
    print(f"Active alerts: {len(data['active'])}")
    return data

# 主循环
if __name__ == '__main__':
    health = get_health()
    alerts = get_alerts()
```

---

## 速率限制

当前版本无速率限制。生产环境建议添加：

- 每分钟最多 100 次请求
- 使用 Redis 实现分布式限流

---

## 版本控制

API 版本通过 URL 前缀控制：

- 当前版本: `/api/`
- 未来版本: `/api/v2/`

---

## WebSocket API（计划中）

未来将支持 WebSocket 实时推送：

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

---

## 附录

### OpenAPI 规范

完整的 OpenAPI 3.0 规范可访问：

```
http://localhost:8080/api/docs
```

### Postman 集合

导入 Postman 集合进行 API 测试：

```json
{
  "info": {
    "name": "Livestream OS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:8080/api/health"
      }
    }
  ]
}
```
