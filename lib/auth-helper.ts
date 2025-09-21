/**
 * Google Cloud 认证助手
 * 
 * 这个模块提供智能的认证策略：
 * - 本地开发：使用 GOOGLE_APPLICATION_CREDENTIALS 环境变量
 * - 云端部署：使用 Application Default Credentials (ADC)
 * - 支持显式的服务账号凭据（用于特殊情况）
 */

import { GoogleAuth } from 'google-auth-library';
import logger from '@/app/logger';

/**
 * 认证配置接口
 */
interface AuthConfig {
  projectId?: string;
  keyFilename?: string;
  scopes?: string[];
}

/**
 * 创建 Google Auth 客户端
 * 
 * 认证优先级：
 * 1. 如果在 Cloud Run 环境，使用 ADC（最安全）
 * 2. 如果设置了 GOOGLE_APPLICATION_CREDENTIALS，使用该文件
 * 3. 否则尝试使用默认凭据
 */
export function createGoogleAuth(config: AuthConfig = {}): GoogleAuth {
  const {
    projectId = process.env.PROJECT_ID,
    keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes = [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/devstorage.full_control',
      'https://www.googleapis.com/auth/datastore'
    ]
  } = config;

  // 检测运行环境
  const isCloudRun = !!(
    process.env.K_SERVICE || 
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );

  const isLocal = process.env.NODE_ENV === 'development' || !isCloudRun;

  logger.info('初始化 Google Auth', {
    environment: isCloudRun ? 'cloud-run' : 'local',
    projectId,
    hasKeyFile: !!keyFilename,
    useADC: isCloudRun
  });

  // Cloud Run 环境：优先使用 ADC
  if (isCloudRun) {
    logger.info('使用 Application Default Credentials (ADC)');
    return new GoogleAuth({
      projectId,
      scopes,
      // 不设置 keyFilename，让 Google Auth 库自动使用 ADC
    });
  }

  // 本地环境：使用 keyFilename 或回退到 ADC
  if (isLocal && keyFilename) {
    logger.info('使用本地服务账号文件', { keyFilename });
    return new GoogleAuth({
      projectId,
      keyFilename,
      scopes,
    });
  }

  // 回退：尝试使用默认凭据
  logger.info('使用默认凭据（ADC 回退）');
  return new GoogleAuth({
    projectId,
    scopes,
  });
}

/**
 * 获取认证客户端
 */
export async function getAuthClient(config: AuthConfig = {}) {
  const auth = createGoogleAuth(config);
  return await auth.getClient();
}

/**
 * 获取访问令牌
 */
export async function getAccessToken(config: AuthConfig = {}): Promise<string> {
  const auth = createGoogleAuth(config);
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  if (!accessToken.token) {
    throw new Error('无法获取访问令牌');
  }
  
  return accessToken.token;
}

/**
 * 获取项目 ID
 */
export async function getProjectId(config: AuthConfig = {}): Promise<string> {
  const auth = createGoogleAuth(config);
  const projectId = await auth.getProjectId();
  
  if (!projectId) {
    throw new Error('无法获取项目 ID');
  }
  
  return projectId;
}