# 使用抖音云官方 Node.js 镜像
FROM node:20-alpine

WORKDIR /app

# 复制所有文件
COPY . .

# 安装依赖并构建
RUN npm config set registry https://registry.npmmirror.com && \
    npm install && \
    npm run build

# 暴露端口（抖音云要求 8000）
EXPOSE 8000

# 启动应用
CMD ["npm", "start"]
