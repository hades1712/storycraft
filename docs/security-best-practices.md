# 安全最佳实践：从 JSON 文件到 ADC 迁移

## 概述

本文档说明如何从使用服务账号 JSON 文件迁移到更安全的 Application Default Credentials (ADC) 方式。

## 认证方式对比

### 1. 服务账号 JSON 文件（不推荐用于生产）

**优点：**
- 简单易用
- 适合本地开发

**缺点：**
- 包含长期有效的私钥
- 需要安全存储和传输
- 难以轮换
- 容易泄露

### 2. Application Default Credentials (ADC)（推荐）

**优点：**
- 无需管理私钥
- 自动凭据轮换
- 与 GCP 服务深度集成
- 遵循最小权限原则

**缺点：**
- 仅在 GCP 环境中可用
- 需要正确配置服务账号

## 实施策略

### 环境自适应认证

我们的解决方案支持：

1. **本地开发环境**
   - 使用 `GOOGLE_APPLICATION_CREDENTIALS` 环境变量
   - 指向本地服务账号 JSON 文件
   - 便于开发和测试

2. **Cloud Run 生产环境**
   - 使用 ADC 自动认证
   - 通过服务账号身份运行
   - 无需存储私钥

### 代码实现

```typescript
// 智能认证检测
const isCloudRun = !!(
  process.env.K_SERVICE || 
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT
);

if (isCloudRun) {
  // 使用 ADC
  auth = new GoogleAuth({ projectId, scopes });
} else {
  // 使用本地文件
  auth = new GoogleAuth({ projectId, keyFilename, scopes });
}
```

## 部署配置

### Terraform 配置要点

```hcl
# 服务账号配置
resource "google_service_account" "storycraft_service_account" {
  account_id   = "storycraft-service"
  display_name = "StoryCraft Application Service Account"
}

# 最小权限配置
resource "google_project_iam_member" "service_account_roles" {
  for_each = toset([
    "roles/aiplatform.user",
    "roles/storage.objectAdmin",
    "roles/datastore.user",
    # 只授予必需的权限
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.storycraft_service_account.email}"
}

# Cloud Run 服务配置
resource "google_cloud_run_v2_service" "storycraft_service" {
  template {
    # 关键：指定服务账号
    service_account = google_service_account.storycraft_service_account.email
    
    containers {
      # 不设置 GOOGLE_APPLICATION_CREDENTIALS 环境变量
      # Cloud Run 会自动使用服务账号进行 ADC 认证
    }
  }
}
```

## 安全检查清单

### ✅ 生产环境安全要求

- [ ] 使用专用服务账号（不是默认计算服务账号）
- [ ] 应用最小权限原则
- [ ] 不在容器中存储 JSON 文件
- [ ] 启用审计日志
- [ ] 定期审查权限

### ✅ 开发环境安全要求

- [ ] JSON 文件不提交到版本控制
- [ ] 使用 `.gitignore` 排除凭据文件
- [ ] 定期轮换开发用服务账号
- [ ] 限制开发服务账号权限

## 迁移步骤

### 1. 更新代码

```bash
# 安装依赖
npm install google-auth-library

# 更新认证逻辑
# 参考 lib/auth-helper.ts
```

### 2. 测试本地环境

```bash
# 确保本地文件存在
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# 运行应用
npm run dev
```

### 3. 部署到 Cloud Run

```bash
# 使用新的部署脚本
./scripts/deploy-with-adc.sh

# 或使用 Terraform
terraform apply
```

### 4. 验证部署

```bash
# 检查服务状态
gcloud run services describe storycraft --region=us-central1

# 查看日志确认认证成功
gcloud logs read "resource.type=cloud_run_revision" --limit=50
```

## 故障排除

### 常见问题

1. **权限被拒绝**
   - 检查服务账号是否有正确的 IAM 角色
   - 确认 Cloud Run 服务使用了正确的服务账号

2. **认证失败**
   - 验证 ADC 是否正确配置
   - 检查环境变量设置

3. **本地开发问题**
   - 确认 `GOOGLE_APPLICATION_CREDENTIALS` 路径正确
   - 验证 JSON 文件格式和权限

### 调试命令

```bash
# 检查当前认证状态
gcloud auth list

# 测试服务账号权限
gcloud auth activate-service-account --key-file=service-account.json
gcloud projects list

# 检查 Cloud Run 服务配置
gcloud run services describe storycraft --region=us-central1 --format=yaml
```

## 监控和审计

### 推荐监控指标

- 认证失败次数
- API 调用延迟
- 权限被拒绝事件
- 服务账号使用情况

### 审计日志

启用以下审计日志：
- IAM 策略更改
- 服务账号密钥操作
- Cloud Run 服务更新
- 存储和数据库访问

## 总结

通过实施 ADC 认证策略，我们实现了：

1. **更高的安全性**：无私钥存储，自动轮换
2. **更好的运维体验**：无需手动管理凭据
3. **环境一致性**：开发和生产使用相同的代码路径
4. **合规性**：符合 GCP 安全最佳实践

这种方法既保证了安全性，又保持了开发的便利性。