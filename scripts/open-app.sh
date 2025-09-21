#!/bin/bash

# StoryCraft 应用访问脚本
# 由于组织策略限制，需要使用认证访问

echo "🚀 StoryCraft 应用访问"
echo "========================"

# 获取服务URL
SERVICE_URL="https://storycraft-h3j4wu4x4q-uc.a.run.app"
echo "📍 应用URL: $SERVICE_URL"

# 获取身份令牌
echo "🔑 获取身份令牌..."
IDENTITY_TOKEN=$(gcloud auth print-identity-token)

if [ $? -eq 0 ] && [ -n "$IDENTITY_TOKEN" ]; then
    echo "✅ 身份令牌获取成功"
    echo ""
    echo "📋 访问方式："
    echo ""
    echo "1. 使用 curl 测试："
    echo "   curl -H \"Authorization: Bearer $IDENTITY_TOKEN\" $SERVICE_URL"
    echo ""
    echo "2. 浏览器访问（需要先登录 Google 账户）："
    echo "   $SERVICE_URL"
    echo ""
    echo "3. 使用 gcloud 代理访问（推荐）："
    echo "   ./scripts/proxy-access.sh"
    echo "   然后访问: http://localhost:8080"
    echo ""
    echo "4. 手动启动代理："
    echo "   gcloud run services proxy storycraft --region=$REGION --port=8080"
    echo ""
    echo "⚠️  注意：由于组织策略限制，应用无法公开访问"
    echo "   - 组织策略阻止了 allUsers 和 allAuthenticatedUsers 访问"
    echo "   - 推荐使用代理访问方式（选项3）"
else
    echo "❌ 身份令牌获取失败"
    echo "请确保已登录 gcloud: gcloud auth login"
fi