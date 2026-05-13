# Livestream OS 部署指南

## 目录

1. [环境要求](#环境要求)
2. [快速开始](#快速开始)
3. [配置说明](#配置说明)
4. [部署方式](#部署方式)
5. [监控与日志](#监控与日志)
6. [故障排查](#故障排查)
7. [生产环境建议](#生产环境建议)

---

## 环境要求

### 系统要求

- **操作系统**: Linux (Ubuntu 20.04+), macOS 10.15+, Windows 10+
- **CPU**: 2 核心以上
- **内存**: 4GB 以上
- **磁盘**: 10GB 以上可用空间

### 软件要求

- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **Docker**: v20.10.0 或更高版本（可选，用于容器化部署）
- **Docker Compose**: v2.0.0 或更高版本（可选）
- **OBS Studio**: v28.0.0 或更高版本（带 WebSocket 插件）

---

## 快速开始

### 方式一: 本地开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd livestream-os

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写必要配置

# 4. 构建项目
npm run build

# 5. 启动服务
npm run dev
```

### 方式二: Docker 部署

```bash
# 1. 构建并启动
docker-compose up -d

# 2. 查看日志
docker-compose logs -f livestream-os

# 3. 访问仪表板
open http://localhost:8080
```

---

## 配置说明

### 环境变量

创建 `.env` 文件并配置以下变量：

```bash
# OBS WebSocket 配置
OBS_HOST=localhost
OBS_PORT=4455
OBS_PASSWORD=your_password

# 抖音 API 配置
DOUYIN_API_KEY=your_api_key
DOUYIN_API_SECRET=your_api_secret

# 系统配置
NODE_ENV=production
PORT=8080

# 日志级别
LOG_LEVEL=info
```

### OBS 配置

1. 安装 OBS Studio
2. 安装 obs-websocket 插件
3. 配置 WebSocket 服务器:
   - 端口: 4455
   - 密码: 设置安全密码
4. 创建场景:
   - 开场欢迎
   - 产品展示
   - 优惠活动
   - 喂食演示

### 运行时配置

编辑 `src/types/index.ts` 中的 `RuntimeConfig`:

```typescript
export interface RuntimeConfig {
  thresholds: {
    hookDurationMax: 4; // 秒
    avgAttentionMin: 0.5; // 0-1
    dropRiskMax: 0.6; // 0-1
    mutationStepSizeMax: 0.3; // 0-1
    convergenceScoreMin: 0.7; // 0-1
  };
  windows: {
    attentionAggregationMs: 5000; // 毫秒
    intentContextSize: 10; // 评论数
    momentumCalculationMs: 15000; // 毫秒
  };
  safety: {
    maxMutationCycles: 100;
    stabilityTestCycles: 100;
  };
}
```

---

## 部署方式

### 方式一: 直接部署

```bash
# 1. 安装依赖
npm ci --only=production

# 2. 构建
npm run build

# 3. 使用 PM2 启动
npm install -g pm2
pm2 start dist/index.js --name livestream-os

# 4. 设置开机自启
pm2 startup
pm2 save
```

### 方式二: Docker 部署

```bash
# 使用部署脚本
chmod +x deploy.sh

# 构建镜像
./deploy.sh --build

# 启动服务
./deploy.sh --start

# 查看状态
./deploy.sh --status

# 查看日志
./deploy.sh --logs

# 停止服务
./deploy.sh --stop

# 重启服务
./deploy.sh --restart
```

### 方式三: Kubernetes 部署

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livestream-os
spec:
  replicas: 2
  selector:
    matchLabels:
      app: livestream-os
  template:
    metadata:
      labels:
        app: livestream-os
    spec:
      containers:
      - name: livestream-os
        image: livestream-os:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

---

## 监控与日志

### 监控仪表板

访问 `http://localhost:8080` 查看实时监控仪表板，包括：

- 性能指标（延迟、吞吐量）
- 业务指标（注意力、转化率）
- 系统状态（健康检查、连接状态）
- 活动告警

### Prometheus + Grafana

使用 Docker Compose 启动完整监控栈：

```bash
docker-compose up -d
```

访问：
- Grafana: `http://localhost:3000` (admin/admin)
- Prometheus: `http://localhost:9090`

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f livestream-os

# 查看最近 100 行日志
docker-compose logs --tail=100 livestream-os

# 日志文件位置
./logs/livestream-os.log
```

---

## 故障排查

### 常见问题

#### 1. OBS 连接失败

**症状**: 无法连接到 OBS WebSocket

**排查步骤**:
```bash
# 检查 OBS 是否运行
ps aux | grep obs

# 检查 WebSocket 端口
netstat -an | grep 4455

# 测试连接
npm run test-obs
```

**解决方案**:
- 确保 OBS 正在运行
- 检查 WebSocket 配置（端口、密码）
- 检查防火墙设置

#### 2. 内存使用过高

**症状**: 内存使用超过 500MB

**排查步骤**:
```bash
# 查看内存使用
docker stats livestream-os

# 查看堆内存
curl http://localhost:8080/api/health | jq '.performance.memoryUsage'
```

**解决方案**:
- 重启服务
- 检查事件队列大小
- 调整垃圾回收参数

#### 3. 熔断器频繁打开

**症状**: Circuit breaker 状态频繁切换

**排查步骤**:
```bash
# 查看熔断器状态
curl http://localhost:8080/api/health | jq '.system.circuitBreakerStates'
```

**解决方案**:
- 检查下游服务健康状态
- 调整熔断器阈值
- 检查网络连接

### 健康检查

```bash
# 完整健康检查
curl http://localhost:8080/api/health

# 仅检查系统状态
curl http://localhost:8080/api/health | jq '.system.healthStatus'
```

---

## 生产环境建议

### 性能优化

1. **启用集群模式**
```bash
pm2 start dist/index.js -i max
```

2. **调整 Node.js 参数**
```bash
node --max-old-space-size=4096 dist/index.js
```

3. **启用 Redis 缓存**
```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

### 安全加固

1. **使用 HTTPS**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
    }
}
```

2. **限制访问**
```yaml
# docker-compose.yml
livestream-os:
  environment:
    - ALLOWED_ORIGINS=https://your-domain.com
```

3. **定期备份**
```bash
# 备份数据库
sqlite3 data/knowledge.db ".backup 'backup/knowledge.db'"
```

### 高可用部署

1. **负载均衡**
```nginx
upstream livestream_os {
    server app1:8080;
    server app2:8080;
}

server {
    location / {
        proxy_pass http://livestream_os;
    }
}
```

2. **数据库复制**
```yaml
# 主从复制配置
redis:
  image: redis:7-alpine
  command: redis-server --replicaof master-redis 6379
```

3. **自动故障转移**
```yaml
# 使用 Docker Swarm 或 Kubernetes
deploy:
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
  restart_policy:
    condition: on-failure
```

---

## 附录

### 有用的命令

```bash
# 查看所有容器状态
docker-compose ps

# 进入容器
docker-compose exec livestream-os sh

# 重新构建并启动
docker-compose up -d --build

# 清理所有容器和卷
docker-compose down -v

# 查看资源使用
docker stats
```

### 参考链接

- [OBS WebSocket 文档](https://github.com/obsproject/obs-websocket)
- [Docker 文档](https://docs.docker.com/)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)
