# StoryCraft 使用 gcloud run 部署指南

本指南将详细介绍如何使用 `gcloud run` 命令直接部署 StoryCraft 应用到 Google Cloud Platform，包括所有必要的前置步骤和验证。
## 目录
1. [前置要求](#前置要求)
2. [环境准备](#环境准备)
3. [GCP 服务配置](#gcp-服务配置)
4. [构建和部署](#构建和部署)
5. [验证和测试](#验证和测试)
6. [故障排除](#故障排除)

## 前置要求

### 1. 安装必要工具

```bash
# 安装 Google Cloud CLI (macOS)
brew install google-cloud-sdk

# 验证安装
gcloud version

# 安装 Docker (可选 - 仅在使用方法二手动构建镜像时需要)
# brew install docker
# docker --version
```

### 2. 设置 Google Cloud 项目

```bash
# 创建新项目（可选）
gcloud projects create YOUR_PROJECT_ID --name="StoryCraft"

# 设置当前项目
gcloud config set project YOUR_PROJECT_ID

# 验证当前项目
gcloud config get-value project

# 登录认证
gcloud auth login

# 配置 Docker 认证 (仅在使用方法二手动构建镜像时需要)
# gcloud auth configure-docker us-central1-docker.pkg.dev
```

## 环境准备

### 1. 准备并加载环境变量文件

```bash
# 复制生产环境模板（如果还没有的话）
cp .env.production.template .env.production

# 编辑 .env.production 文件，填入您的实际配置值
# 然后加载环境变量到当前会话
set -a  # 自动导出所有变量
source .env.production
set +a  # 关闭自动导出

# 验证关键变量已加载
echo "项目ID: $PROJECT_ID"
echo "部署区域: $LOCATION"
echo "存储桶名称: $GCS_BUCKET_NAME"
```

**重要提醒**：
- ✅ 执行 `source .env.production` 后，所有环境变量都可在当前终端会话中使用
- ✅ 下面的所有 gcloud 命令都会使用这些变量（如 `$PROJECT_ID`, `$LOCATION` 等）
- ⚠️ 首次部署后需要更新 `NEXTAUTH_URL` 为实际的 Cloud Run URL
- 📝 如需参考配置模板，请查看 `.env.production.template` 文件
- 💡 如果切换到新的终端窗口，需要重新执行 `source .env.production`



## GCP 服务配置

### 1. 启用必要的 API 服务

```bash
# 启用所有必需的 API（一次性执行）
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  storage.googleapis.com \
  firestore.googleapis.com \
  texttospeech.googleapis.com \
  translate.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com

# 验证 API 启用状态
gcloud services list --enabled --filter="name:(run.googleapis.com OR aiplatform.googleapis.com OR storage.googleapis.com OR firestore.googleapis.com)"
```

### 2. 创建 Artifact Registry 仓库

```bash
# 创建 Docker 镜像仓库
# 注意：使用 --source=. 部署时，gcloud 会自动创建仓库，此步骤可选
gcloud artifacts repositories create storycraft \
  --repository-format=docker \
  --location=$LOCATION \
  --description="StoryCraft application container images" \
  --project=$PROJECT_ID

# 验证仓库创建
gcloud artifacts repositories list --location=$LOCATION --project=$PROJECT_ID
```

### 3. 创建和配置 Firestore 数据库

```bash
# 创建 Firestore 数据库（使用 .env.production 中的配置）
# 注意：如果项目已有默认数据库，可跳过此步骤
# Firestore 区域通常使用 multi-region，这里使用 us-central
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native \
  --project=$PROJECT_ID

# 验证数据库创建
gcloud firestore databases list --project=$PROJECT_ID

# 验证数据库ID配置
echo "Firestore 数据库ID: $FIRESTORE_DATABASE_ID"

# 创建必要的复合索引（如果需要）
# 注意：通常在应用首次运行时会自动创建索引
```

### 4. 创建 Cloud Storage 存储桶

```bash
# 使用从 .env.production 加载的存储桶名称
# 无需手动设置，直接使用 $GCS_BUCKET_NAME 变量
echo "创建存储桶: $GCS_BUCKET_NAME"

# 创建存储桶
gcloud storage buckets create gs://$GCS_BUCKET_NAME \
  --location=$LOCATION \
  --uniform-bucket-level-access \
  --project=$PROJECT_ID

# 验证存储桶配置
gcloud storage buckets describe gs://$GCS_BUCKET_NAME --project=$PROJECT_ID
```

### 5. 创建服务账户和权限配置

```bash
# 创建服务账户
gcloud iam service-accounts create storycraft-service \
  --display-name="StoryCraft Service Account" \
  --description="Service account for StoryCraft application" \
  --project=$PROJECT_ID

# 设置服务账户变量
export SERVICE_ACCOUNT="storycraft-service@$PROJECT_ID.iam.gserviceaccount.com"

# 分配必要的 IAM 角色
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/texttospeech.serviceAgent"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/cloudtranslate.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/cloudtrace.agent"

# 验证服务账户权限
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:$SERVICE_ACCOUNT"
```

### 6. 配置 Cloud Storage CORS

当浏览器直接访问 GCS 中的图片/视频对象（包含分段播放的 Range 请求）时，必须为存储桶启用 CORS，否则会出现跨域或预检失败等问题。

【推荐：最小权限配置】

```bash
# 准备 cors.json（将域名替换为你的实际访问来源）
cat > cors.json << 'EOF'
[
  {
    "origin": [
      "http://localhost:3000",
      "https://your-domain.com",
      "https://YOUR_CLOUD_RUN_URL.a.run.app"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Range"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF

# 使用 gcloud storage 应用 CORS 配置（推荐）
gcloud storage buckets update gs://$GCS_BUCKET_NAME --cors-file=cors.json --project=$PROJECT_ID

# 或者使用 gsutil（等效方案）
# gsutil cors set cors.json gs://$GCS_BUCKET_NAME

# 验证 CORS 已生效
gcloud storage buckets describe gs://$GCS_BUCKET_NAME --project=$PROJECT_ID | sed -n '/cors/,+10p'

# 预检（OPTIONS）测试示例（对象路径替换为真实文件）
curl -i -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  "https://storage.googleapis.com/$GCS_BUCKET_NAME/path/to/your/object.jpg"
```

【可选：宽松配置（与 terraform/main.tf 保持一致）】

```bash
cat > cors-permissive.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

# 套用宽松配置（如需与 Terraform 一致）
gcloud storage buckets update gs://$GCS_BUCKET_NAME --cors-file=cors-permissive.json --project=$PROJECT_ID
```

提示：若你通过 Terraform 部署，terraform/main.tf 中已包含 cors 配置块，无需重复设置；但你仍可使用上述命令覆盖更新为更严格或更宽松的策略。

## 构建和部署

### 🚀 使用自动化脚本部署（推荐）

```bash
# 使用自动化部署脚本（推荐方式）
./scripts/deploy-cloud-run.sh
```

**脚本优势：**
- 自动加载 `.env.production` 中的环境变量
- 验证必要的配置项
- 智能处理环境变量格式转换
- 提供详细的部署进度信息
- 自动获取和显示服务 URL

### 手动部署方式

如果您需要手动控制部署过程，可以使用以下命令：

```bash
# 直接从源代码构建和部署到 Cloud Run
# gcloud 会自动构建 Docker 镜像并推送到 Artifact Registry
# 注意：使用 --set-env-vars 而不是 --env-vars-file，因为 .env.production 是环境变量格式而非 YAML 格式
gcloud run deploy storycraft \
  --source=. \
  --platform=managed \
  --region=$LOCATION \
  --service-account=$SERVICE_ACCOUNT \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=100 \
  --timeout=3600 \
  --concurrency=1000 \
  --port=3000 \
  --set-env-vars="PROJECT_ID=$PROJECT_ID,LOCATION=$LOCATION,FIRESTORE_DATABASE_ID=$FIRESTORE_DATABASE_ID,GCS_BUCKET_NAME=$GCS_BUCKET_NAME,NEXTAUTH_URL=$NEXTAUTH_URL,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,MODEL=$MODEL,APP_SECRET_KEY=$APP_SECRET_KEY,LOG_LEVEL=$LOG_LEVEL,USE_COSMO=$USE_COSMO"

# 获取服务 URL
export SERVICE_URL=$(gcloud run services describe storycraft \
  --region=us-central1 \
  --format="value(status.url)")

echo "Service deployed at: $SERVICE_URL"
```

### 3. 更新 NextAuth URL

```bash
# 更新 .env.production 文件中的 NEXTAUTH_URL
sed -i.bak "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$SERVICE_URL|" .env.production

# 重新部署以应用新的 NEXTAUTH_URL
gcloud run deploy storycraft \
  --image=$IMAGE_TAG \
  --platform=managed \
  --region=us-central1 \
  --env-vars-file=.env.production
```

## 验证和测试

### 1. 检查服务状态

```bash
# 查看服务详情
gcloud run services describe storycraft --region=us-central1

# 查看最新版本
gcloud run revisions list --service=storycraft --region=us-central1 --limit=5

# 检查服务健康状态
curl -I $SERVICE_URL/api/health
```

### 2. 查看日志

```bash
# 查看实时日志
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft" \
  --location=us-central1

# 查看最近的错误日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft AND severity>=ERROR" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

### 3. 测试应用功能

```bash
# 测试主页
curl -s $SERVICE_URL | grep -o "<title>.*</title>"

# 测试 API 端点
curl -s $SERVICE_URL/api/health

# 测试认证端点
curl -s $SERVICE_URL/api/auth/providers
```

🎉 部署完成！

## 访问应用

由于组织策略限制，应用需要认证访问。您可以使用以下方式访问：

### 方式一：使用访问脚本（推荐）
```bash
bash scripts/open-app.sh
```

### 方式二：手动访问
1. 确保已登录 Google Cloud：
   ```bash
   gcloud auth login
   ```

2. 在浏览器中访问：
   ```
   https://storycraft-h3j4wu4x4q-uc.a.run.app
   ```

### 方式三：使用 curl 测试
```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://storycraft-h3j4wu4x4q-uc.a.run.app
```

### 注意事项
- 应用需要认证访问，无法公开访问
- 如需公开访问，请联系管理员调整组织策略
- 确保使用的 Google 账号有访问权限

## 故障排除

### 常见问题和解决方案

#### 1. 权限错误

```bash
# 检查当前用户权限
gcloud auth list
gcloud projects get-iam-policy $PROJECT_ID --filter="bindings.members:$(gcloud config get-value account)"

# 重新认证
gcloud auth login
gcloud auth application-default login
```

#### 2. API 未启用错误

```bash
# 检查 API 状态
gcloud services list --enabled --filter="name:SERVICE_NAME"

# 启用缺失的 API
gcloud services enable SERVICE_NAME
```

#### 3. 镜像推送失败

```bash
# 重新配置 Docker 认证
gcloud auth configure-docker us-central1-docker.pkg.dev

# 检查仓库是否存在
gcloud artifacts repositories list --location=us-central1

# 手动推送测试
docker push $IMAGE_TAG
```

#### 4. Cloud Run 部署失败

```bash
# 检查服务账户权限
gcloud iam service-accounts get-iam-policy $SERVICE_ACCOUNT

# 查看部署日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft" \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)"

# 检查环境变量
gcloud run services describe storycraft --region=us-central1 \
  --format="export" | grep -A 20 "env:"
```

#### 5. 应用运行时错误

```bash
# 检查环境变量配置
gcloud run services describe storycraft --region=us-central1 \
  --format="value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"

# 查看详细错误日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft AND severity>=WARNING" \
  --limit=100 \
  --format="table(timestamp,severity,textPayload,jsonPayload.message)"
```

### 有用的调试命令

```bash
# 查看项目配额
gcloud compute project-info describe --project=$PROJECT_ID

# 检查计费状态
gcloud billing projects describe $PROJECT_ID

# 查看所有 Cloud Run 服务
gcloud run services list --region=us-central1

# 查看存储桶内容
gcloud storage ls gs://$BUCKET_NAME

# 测试 Firestore 连接
gcloud firestore databases list
```

## 更新和维护

### 更新应用

**方法一：从源代码更新（推荐）**

```bash
# 直接从源代码部署新版本
gcloud run deploy storycraft \
  --source=. \
  --region=us-central1

# 查看部署历史
gcloud run revisions list --service=storycraft --region=us-central1
```

**方法二：从预构建镜像更新**

```bash
# 构建新版本
docker build -t $IMAGE_TAG .
docker push $IMAGE_TAG

# 部署新版本
gcloud run deploy storycraft \
  --image=$IMAGE_TAG \
  --region=us-central1

# 查看部署历史
gcloud run revisions list --service=storycraft --region=us-central1
```

### 回滚版本

```bash
# 查看可用版本
gcloud run revisions list --service=storycraft --region=us-central1

# 回滚到指定版本
gcloud run services update-traffic storycraft \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

### 扩缩容配置

```bash
# 更新实例数量限制
gcloud run services update storycraft \
  --min-instances=1 \
  --max-instances=50 \
  --region=us-central1

# 更新资源配置
gcloud run services update storycraft \
  --memory=8Gi \
  --cpu=4 \
  --region=us-central1
```

## 安全最佳实践

1. **使用 Secret Manager**：
   ```bash
   # 创建密钥
   echo -n "your-secret-value" | gcloud secrets create secret-name --data-file=-
   
   # 在 Cloud Run 中使用密钥
   gcloud run deploy storycraft \
     --set-secrets="ENV_VAR_NAME=secret-name:latest"
   ```

2. **限制网络访问**：
   ```bash
   # 仅允许内部访问
   gcloud run deploy storycraft --no-allow-unauthenticated
   ```

3. **设置自定义域名**：
   ```bash
   # 映射自定义域名
   gcloud run domain-mappings create --service=storycraft --domain=yourdomain.com
   ```
