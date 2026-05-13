#!/bin/bash

# Livestream OS 部署脚本
# 用法: ./deploy.sh [选项]
# 选项:
#   --build     重新构建镜像
#   --start     启动服务
#   --stop      停止服务
#   --restart   重启服务
#   --logs      查看日志
#   --status    查看状态
#   --clean     清理所有容器和卷

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi

    print_info "Docker 环境检查通过"
}

# 构建镜像
build() {
    print_info "构建 Docker 镜像..."
    docker-compose build --no-cache
    print_info "镜像构建完成"
}

# 启动服务
start() {
    print_info "启动服务..."
    docker-compose up -d
    print_info "服务已启动"
    status
}

# 停止服务
stop() {
    print_info "停止服务..."
    docker-compose down
    print_info "服务已停止"
}

# 重启服务
restart() {
    print_info "重启服务..."
    stop
    start
}

# 查看日志
logs() {
    docker-compose logs -f livestream-os
}

# 查看状态
status() {
    print_info "服务状态:"
    docker-compose ps
    echo ""
    print_info "健康检查:"
    curl -s http://localhost:8080/api/health | jq . || echo "无法访问健康检查端点"
}

# 清理
clean() {
    print_warn "这将删除所有容器、卷和数据"
    read -p "确认清理? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理中..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_info "清理完成"
    else
        print_info "取消清理"
    fi
}

# 主函数
main() {
    check_docker

    case "$1" in
        --build)
            build
            ;;
        --start)
            start
            ;;
        --stop)
            stop
            ;;
        --restart)
            restart
            ;;
        --logs)
            logs
            ;;
        --status)
            status
            ;;
        --clean)
            clean
            ;;
        *)
            echo "用法: $0 {--build|--start|--stop|--restart|--logs|--status|--clean}"
            exit 1
            ;;
    esac
}

main "$@"
