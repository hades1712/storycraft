'use server';

import { getMimeTypeFromGCS, getSignedUrlFromGCS, uploadImage } from '@/lib/storage';
import { unstable_cache as cache } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';

// 读取服务端配置的签名URL TTL（秒），并限制最大7天；这里与 lib/storage.ts 保持一致
const MAX_V4_TTL_SECONDS = 604800; // 7 天
const envTtl = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS || '3600');
const SIGNED_URL_TTL_SECONDS = Number.isFinite(envTtl) && envTtl > 0 ? Math.min(envTtl, MAX_V4_TTL_SECONDS) : 3600;

// 为了避免在即将过期的边界出现 403，给缓存设置比TTL更短的revalidate时间（例如 TTL 的 90%）。
const CACHE_SECONDS = Math.max(60, Math.floor(SIGNED_URL_TTL_SECONDS * 0.9));

// 返回值结构
type SignedUrlResult = { url: string | null; mimeType: string | null };

// 使用工厂方法基于参数创建带缓存的函数，这样可以为不同的 gcsUri / download 生成不同的缓存键
async function getCachedSignedUrl(gcsUri: string, download: boolean = false): Promise<SignedUrlResult> {
  const cachedFn = cache(
    async (): Promise<SignedUrlResult> => {
      logger.debug(`CACHE MISS: Fetching signed URL for ${gcsUri}, download=${download}`);
      if (!gcsUri || !gcsUri.startsWith('gs://')) {
        logger.error(`Invalid GCS URI passed to cached function: ${gcsUri}`);
        return { url: null, mimeType: null }; 
      }
      try {
        const mimeType = await getMimeTypeFromGCS(gcsUri);
        const url = await getSignedUrlFromGCS(gcsUri, download);
        return { url, mimeType };
      } catch (error) {
        logger.error(`Error getting signed URL for ${gcsUri} inside cache function:`, error);
        return { url: null, mimeType: null };
      }
    },
    // keyParts 必须是静态字符串数组，这里根据参数构造唯一键
    ['gcs-signed-url', gcsUri, download ? 'dl' : 'view'],
    {
      revalidate: CACHE_SECONDS,
      tags: ['gcs-url']
    }
  );

  return cachedFn();
}

/**
 * Server Action to securely get a signed URL for a GCS object.
 * 支持通过 options.forceRefresh 强制刷新（绕过缓存）
 * 
 * @param gcsUri The gs:// URI of the object.
 * @param download 是否下载
 * @param options 可选项：{ forceRefresh?: boolean }
 * @returns A promise that resolves to the signed URL string, or null if an error occurs or URI is invalid.
 */
export async function getDynamicImageUrl(
  gcsUri: string,
  download : boolean = false,
  options?: { forceRefresh?: boolean }
): Promise<SignedUrlResult> {
  logger.debug(`getDynamicImageUrl: ${gcsUri}, download=${download}, forceRefresh=${!!options?.forceRefresh}`);

  if (options?.forceRefresh) {
    // 直接绕过 cache：重新生成签名URL
    try {
      const mimeType = await getMimeTypeFromGCS(gcsUri);
      const url = await getSignedUrlFromGCS(gcsUri, download);
      return { url, mimeType };
    } catch (error) {
      logger.error(`Force refresh signed URL failed for ${gcsUri}:`, error);
      return { url: null, mimeType: null };
    }
  }

  // 默认情况下使用缓存
  return getCachedSignedUrl(gcsUri, download);
}

export async function uploadImageToGCS(base64: string): Promise<string | null> {
  // 使用 .jpg 扩展名，因为 uploadImage 会转换为 JPEG 格式
  const gcsUri = await uploadImage(base64, `${uuidv4()}.jpg`);
  return gcsUri;
}