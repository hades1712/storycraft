# StoryCraft 云上部署准备清单

## 1. Google Cloud CLI 安装和配置

### 安装 Google Cloud CLI
```bash
# macOS (使用 Homebrew)
brew install google-cloud-sdk

# 或者下载安装包
# https://cloud.google.com/sdk/docs/install
```

### 配置认证
```bash
# 登录 Google Cloud
gcloud auth login

# 设置默认项目
gcloud config set project YOUR_PROJECT_ID

# 配置 Docker 认证 (用于推送镜像)
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## 2. Google Cloud 项目设置

### 启用必需的 API
```bash
# 启用 Cloud Run API
gcloud services enable run.googleapis.com

# 启用 Vertex AI API
gcloud services enable aiplatform.googleapis.com

# 启用 Cloud Storage API
gcloud services enable storage.googleapis.com

# 启用 Text-to-Speech API
gcloud services enable texttospeech.googleapis.com

# 启用 Artifact Registry API (用于存储 Docker 镜像)
gcloud services enable artifactregistry.googleapis.com

# 启用 Firestore API
gcloud services enable firestore.googleapis.com
```

### 创建 Artifact Registry 仓库
```bash
gcloud artifacts repositories create vertexai \
    --repository-format=docker \
    --location=us-central1 \
    --description="StoryCraft Docker images"
```

### 创建 Cloud Storage 存储桶
```bash
# 创建存储桶 (名称必须全局唯一)
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://YOUR_BUCKET_NAME

# 设置存储桶权限 (可选，根据需要调整)
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

## 3. 服务账户和权限配置

### 为 Cloud Run 服务创建服务账户
```bash
# 创建服务账户
gcloud iam service-accounts create storycraft-service \
    --description="StoryCraft application service account" \
    --display-name="StoryCraft Service"

# 授予必要权限
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:storycraft-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:storycraft-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:storycraft-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudtts.synthesizer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:storycraft-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
```

## 4. 环境变量配置

### 更新 deploy.ipynb 文件
修改以下变量以匹配您的项目：

```python
PROJECT_ID = "YOUR_PROJECT_ID"  # 您的 GCP 项目 ID
REGION = "us-central1"          # 部署区域
SERVICE = "storycraft"          # Cloud Run 服务名称
```

### 生产环境变量
在部署命令中需要设置的环境变量：

- `PROJECT_ID`: 您的 GCP 项目 ID
- `LOCATION`: 区域 (建议 us-central1)
- `MODEL`: AI 模型名称 (veo-3.0-generate-preview)
- `GCS_BUCKET_NAME`: 您的存储桶名称 (不包含 gs:// 前缀)
- `NEXTAUTH_URL`: 您的应用 URL
- `NEXTAUTH_SECRET`: NextAuth.js 密钥
- `GOOGLE_CLIENT_ID`: Google OAuth 客户端 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 客户端密钥

## 5. OAuth 配置

### 设置 Google OAuth
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 导航到 "APIs & Services" > "Credentials"
3. 创建 OAuth 2.0 客户端 ID
4. 设置授权重定向 URI：
   - `https://YOUR_APP_URL/api/auth/callback/google`

## 6. 部署步骤

### 方法 1: 使用 deploy.ipynb (推荐)
1. 打开 `deploy.ipynb` 文件
2. 更新项目配置变量
3. 逐个执行单元格

### 方法 2: 使用命令行
```bash
# 构建并推送镜像
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/vertexai/storycraft:v1 .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/vertexai/storycraft:v1

# 部署到 Cloud Run
gcloud run deploy storycraft \
    --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/vertexai/storycraft:v1 \
    --cpu 1 \
    --memory 2G \
    --region us-central1 \
    --service-account storycraft-service@YOUR_PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars PROJECT_ID="YOUR_PROJECT_ID",LOCATION="us-central1",MODEL="veo-3.0-generate-preview",GCS_BUCKET_NAME="YOUR_BUCKET_NAME",NEXTAUTH_URL="https://YOUR_APP_URL",NEXTAUTH_SECRET="YOUR_SECRET",GOOGLE_CLIENT_ID="YOUR_CLIENT_ID",GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

## 7. 部署后验证

### 检查服务状态
```bash
# 查看服务状态
gcloud run services describe storycraft --region us-central1

# 查看日志
gcloud run services logs tail storycraft --region us-central1
```

### 测试功能
1. 访问部署的应用 URL
2. 测试 Google OAuth 登录
3. 测试视频生成功能
4. 检查文件上传到 Cloud Storage

## 注意事项

1. **成本控制**: Cloud Run 按使用量计费，建议设置预算警报
2. **安全性**: 确保所有密钥和敏感信息通过环境变量传递，不要硬编码
3. **监控**: 设置 Cloud Monitoring 和 Error Reporting
4. **备份**: 定期备份 Firestore 数据
5. **更新**: 定期更新依赖项和基础镜像

## 故障排除

### 常见问题
1. **权限错误**: 检查服务账户权限配置
2. **存储桶访问**: 确认存储桶名称和权限设置
3. **API 限制**: 检查 API 配额和限制
4. **内存不足**: 根据需要调整 Cloud Run 内存配置