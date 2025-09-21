#!/bin/bash

# Cloud Run 部署脚本
# 此脚本会自动加载 .env.production 文件中的环境变量并部署到 Cloud Run
# 默认启用公开访问，所有用户都可以访问应用

set -e  # 遇到错误时退出

echo "🚀 开始部署 StoryCraft 到 Cloud Run..."
echo "🌐 模式：公开访问（所有用户都可以访问）"

# 检查必要文件是否存在
if [ ! -f ".env.production" ]; then
    echo "❌ 错误：.env.production 文件不存在"
    echo "请先复制 .env.production.template 并配置相应的值"
    exit 1
fi

# 加载环境变量
echo "📋 加载环境变量..."
set -a  # 自动导出所有变量
source .env.production
set +a  # 停止自动导出

# 验证关键环境变量
echo "🔍 验证关键环境变量..."
required_vars=("PROJECT_ID" "LOCATION" "GCS_BUCKET_NAME" "SERVICE_ACCOUNT")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 错误：环境变量 $var 未设置"
        exit 1
    fi
done

echo "✅ 环境变量验证通过"
echo "   PROJECT_ID: $PROJECT_ID"
echo "   LOCATION: $LOCATION"
echo "   GCS_BUCKET_NAME: $GCS_BUCKET_NAME"
echo "   SERVICE_ACCOUNT: $SERVICE_ACCOUNT"

# 构建环境变量字符串
ENV_VARS="PROJECT_ID=$PROJECT_ID"
ENV_VARS="$ENV_VARS,LOCATION=$LOCATION"
ENV_VARS="$ENV_VARS,FIRESTORE_DATABASE_ID=$FIRESTORE_DATABASE_ID"
ENV_VARS="$ENV_VARS,GCS_BUCKET_NAME=$GCS_BUCKET_NAME"
ENV_VARS="$ENV_VARS,SERVICE_ACCOUNT=$SERVICE_ACCOUNT"
ENV_VARS="$ENV_VARS,NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
ENV_VARS="$ENV_VARS,MODEL=$MODEL"
ENV_VARS="$ENV_VARS,APP_SECRET_KEY=$APP_SECRET_KEY"
ENV_VARS="$ENV_VARS,LOG_LEVEL=$LOG_LEVEL"
ENV_VARS="$ENV_VARS,USE_COSMO=$USE_COSMO"

# 如果设置了 NEXTAUTH_URL，则添加到环境变量中
if [ -n "$NEXTAUTH_URL" ]; then
    ENV_VARS="$ENV_VARS,NEXTAUTH_URL=$NEXTAUTH_URL"
fi

# 如果设置了 AUTH_TRUST_HOST，则添加到环境变量中
if [ -n "$AUTH_TRUST_HOST" ]; then
    ENV_VARS="$ENV_VARS,AUTH_TRUST_HOST=$AUTH_TRUST_HOST"
fi

echo "🔨 开始部署到 Cloud Run..."

# 部署到 Cloud Run（启用公开访问）
gcloud run deploy storycraft \
  --source=. \
  --platform=managed \
  --region=$LOCATION \
  --service-account=$SERVICE_ACCOUNT \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --concurrency=100 \
  --port=3000 \
  --set-env-vars="$ENV_VARS"

echo "🔓 设置公开访问权限..."
# 为所有用户授予调用权限（这是关键步骤！）
gcloud run services add-iam-policy-binding storycraft \
    --region=$LOCATION \
    --member="allUsers" \
    --role="roles/run.invoker"

echo "✅ 已启用公开访问，所有用户都可以访问服务"

# 获取服务 URL
echo "📡 获取服务 URL..."
SERVICE_URL=$(gcloud run services describe storycraft \
  --region=$LOCATION \
  --format="value(status.url)")

echo "✅ 部署成功！"
echo "🌐 服务 URL: $SERVICE_URL"

# 如果 NEXTAUTH_URL 未设置或与当前 URL 不同，提示更新
if [ -z "$NEXTAUTH_URL" ] || [ "$NEXTAUTH_URL" != "$SERVICE_URL" ]; then
    echo ""
    echo "⚠️  注意：需要更新 NEXTAUTH_URL"
    echo "请在 .env.production 文件中设置："
    echo "NEXTAUTH_URL=$SERVICE_URL"
    echo ""
    echo "然后重新运行此脚本以应用更新的 URL"
fi

echo ""
echo "🎉 部署完成！所有用户都可以直接访问 $SERVICE_URL"
echo "💡 无需任何认证，可以直接在浏览器中打开链接"