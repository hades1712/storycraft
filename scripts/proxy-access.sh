#!/bin/bash

# Storycraft 代理访问脚本
# 由于组织策略限制，无法直接公开访问，使用gcloud代理

set -e

# 加载环境变量
if [ -f .env.local ]; then
    source .env.local
fi

# 检查必要的环境变量
if [ -z "$PROJECT_ID" ]; then
    echo "错误: PROJECT_ID 环境变量未设置"
    exit 1
fi

REGION="us-central1"
SERVICE_NAME="storycraft"

echo "🚀 启动 Storycraft 代理访问..."
echo "📍 项目: $PROJECT_ID"
echo "🌍 区域: $REGION"
echo "🔧 服务: $SERVICE_NAME"
echo ""

# 获取服务URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.url)")

if [ -z "$SERVICE_URL" ]; then
    echo "❌ 无法获取服务URL，请确保服务已部署"
    exit 1
fi

echo "🔗 服务URL: $SERVICE_URL"
echo ""

# 启动gcloud代理
echo "🔄 启动 gcloud 代理..."
echo "📝 注意: 由于组织策略限制，应用需要通过代理访问"
echo "🌐 代理将在 http://localhost:8080 启动"
echo ""
echo "⚠️  请保持此终端窗口打开"
echo "🔗 在浏览器中访问: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止代理"
echo ""

# 启动代理
gcloud run services proxy $SERVICE_NAME --region=$REGION --port=8080