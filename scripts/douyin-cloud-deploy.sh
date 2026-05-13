#!/bin/bash

# 抖音云部署脚本
# 用于构建、推送和部署应用到抖音云

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量（需要用户填写）
DOCKER_REGISTRY="${DOCKER_REGISTRY:-registry.douyin-cloud.com}"
NAMESPACE="${NAMESPACE:-your-namespace}"
IMAGE_NAME="${IMAGE_NAME:-livestream-os}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}检查依赖...${NC}"
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: 未安装 Docker${NC}"
        echo "请先安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # 检查抖音云 CLI
    if ! command -v douyin-cloud &> /dev/null; then
        echo -e "${YELLOW}警告: 未安装抖音云 CLI${NC}"
        echo "请访问抖音开放平台文档了解如何安装抖音云 CLI"
        echo "https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/douyincloud/guide"
    fi
    
    echo -e "${GREEN}✓ 依赖检查完成${NC}"
}

# 构建 Docker 镜像
build_image() {
    echo -e "${YELLOW}构建 Docker 镜像...${NC}"
    
    cd "$(dirname "$0")/.."
    
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
    
    echo -e "${GREEN}✓ 镜像构建完成: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
}

# 登录抖音云镜像仓库
login_registry() {
    echo -e "${YELLOW}登录抖音云镜像仓库...${NC}"
    
    if [ -z "$DOCKER_REGISTRY" ]; then
        echo -e "${RED}错误: 未设置 DOCKER_REGISTRY 环境变量${NC}"
        echo "请在抖音云控制台获取镜像仓库地址"
        exit 1
    fi
    
    # 使用抖音云 CLI 登录
    if command -v douyin-cloud &> /dev/null; then
        douyin-cloud docker login
    else
        echo -e "${YELLOW}请手动登录镜像仓库:${NC}"
        echo "docker login ${DOCKER_REGISTRY}"
    fi
    
    echo -e "${GREEN}✓ 镜像仓库登录完成${NC}"
}

# 推送镜像到抖音云
push_image() {
    echo -e "${YELLOW}推送镜像到抖音云...${NC}"
    
    # 标记镜像
    local full_image="${DOCKER_REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${full_image}
    
    # 推送镜像
    docker push ${full_image}
    
    echo -e "${GREEN}✓ 镜像推送完成: ${full_image}${NC}"
}

# 部署到抖音云
deploy() {
    echo -e "${YELLOW}部署到抖音云...${NC}"
    
    if command -v douyin-cloud &> /dev/null; then
        # 应用 Kubernetes 配置
        douyin-cloud kubectl apply -f douyin-cloud.yaml
        
        # 等待部署完成
        echo -e "${YELLOW}等待部署完成...${NC}"
        douyin-cloud kubectl rollout status deployment/livestream-os
        
        echo -e "${GREEN}✓ 部署完成${NC}"
        
        # 获取服务地址
        echo -e "${YELLOW}获取服务地址...${NC}"
        douyin-cloud kubectl get service livestream-os
    else
        echo -e "${YELLOW}请手动部署:${NC}"
        echo "1. 在抖音云控制台创建服务"
        echo "2. 上传镜像: ${DOCKER_REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
        echo "3. 配置环境变量（参考 docs/DOUYIN_CLOUD_DEPLOYMENT.md）"
        echo "4. 启动服务"
    fi
}

# 获取内网地址
get_internal_url() {
    echo -e "${YELLOW}获取内网地址...${NC}"
    
    if command -v douyin-cloud &> /dev/null; then
        # 获取服务信息
        local service_info=$(douyin-cloud kubectl get service livestream-os -o json)
        
        # 提取 ClusterIP
        local cluster_ip=$(echo $service_info | jq -r '.spec.clusterIP')
        
        echo -e "${GREEN}内网回调地址:${NC}"
        echo "http://${cluster_ip}:3000/live_data_callback"
        
        echo ""
        echo -e "${YELLOW}请在抖音开放平台配置此 Webhook 地址${NC}"
    else
        echo -e "${YELLOW}部署完成后，在抖音云控制台查看服务地址${NC}"
        echo "内网地址格式: http://<ClusterIP>:3000/live_data_callback"
    fi
}

# 查看日志
logs() {
    echo -e "${YELLOW}查看应用日志...${NC}"
    
    if command -v douyin-cloud &> /dev/null; then
        douyin-cloud kubectl logs -f deployment/livestream-os
    else
        echo -e "${RED}请安装抖音云 CLI 以查看日志${NC}"
    fi
}

# 查看状态
status() {
    echo -e "${YELLOW}查看服务状态...${NC}"
    
    if command -v douyin-cloud &> /dev/null; then
        douyin-cloud kubectl get pods -l app=livestream-os
        echo ""
        douyin-cloud kubectl get service livestream-os
    else
        echo -e "${RED}请安装抖音云 CLI 以查看状态${NC}"
    fi
}

# 帮助信息
help() {
    echo "抖音云部署脚本"
    echo ""
    echo "用法: $0 <命令>"
    echo ""
    echo "命令:"
    echo "  check     检查依赖"
    echo "  build     构建 Docker 镜像"
    echo "  login     登录抖音云镜像仓库"
    echo "  push      推送镜像到抖音云"
    echo "  deploy    部署到抖音云"
    echo "  url       获取内网回调地址"
    echo "  logs      查看应用日志"
    echo "  status    查看服务状态"
    echo "  all       执行完整部署流程（check -> build -> login -> push -> deploy -> url）"
    echo "  help      显示帮助信息"
    echo ""
    echo "环境变量:"
    echo "  DOCKER_REGISTRY  抖音云镜像仓库地址（默认: registry.douyin-cloud.com）"
    echo "  NAMESPACE        命名空间（默认: your-namespace）"
    echo "  IMAGE_NAME       镜像名称（默认: livestream-os）"
    echo "  IMAGE_TAG        镜像标签（默认: latest）"
}

# 主函数
main() {
    case "${1:-help}" in
        check)
            check_dependencies
            ;;
        build)
            build_image
            ;;
        login)
            login_registry
            ;;
        push)
            push_image
            ;;
        deploy)
            deploy
            ;;
        url)
            get_internal_url
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        all)
            check_dependencies
            build_image
            login_registry
            push_image
            deploy
            get_internal_url
            ;;
        help|--help|-h)
            help
            ;;
        *)
            echo -e "${RED}未知命令: $1${NC}"
            help
            exit 1
            ;;
    esac
}

main "$@"
