import { GetSignedUrlConfig, Storage } from '@google-cloud/storage';
import { createGoogleAuth } from './auth-helper';
import sharp from 'sharp';
import logger from '@/app/logger';

/**
 * 初始化 Google Cloud Storage 客户端
 * 
 * 使用智能认证策略：
 * - Cloud Run: 使用 ADC（服务账号自动认证）
 * - 本地开发: 使用 GOOGLE_APPLICATION_CREDENTIALS 文件
 * 
 * 为了支持签名 URL 生成，需要明确指定服务账户邮箱
 */
async function initializeStorage(): Promise<Storage> {
  try {
    // 检测运行环境
    const isCloudRun = !!(
      process.env.K_SERVICE || 
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT
    );

    // Storage 配置
    const storageConfig: any = {
      projectId: process.env.PROJECT_ID,
    };

    // 在 Cloud Run 环境中，明确指定服务账户邮箱以支持签名 URL
    if (isCloudRun && process.env.SERVICE_ACCOUNT) {
      storageConfig.authClient = await createGoogleAuth({
        projectId: process.env.PROJECT_ID,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/devstorage.full_control'
        ]
      }).getClient();
      
      // 设置服务账户邮箱，这对签名 URL 生成很重要
      storageConfig.authClient.email = process.env.SERVICE_ACCOUNT;
    }

    const storage = new Storage(storageConfig);

    logger.info('Google Cloud Storage 客户端初始化成功', {
      projectId: process.env.PROJECT_ID,
      serviceAccount: process.env.SERVICE_ACCOUNT,
      isCloudRun
    });

    return storage;
  } catch (error) {
    logger.error('Storage 初始化失败', error);
    throw error;
  }
}

// 创建单例实例
let storageInstance: Storage | null = null;

/**
 * 获取 Storage 实例（单例模式）
 */
export async function getStorage(): Promise<Storage> {
  if (!storageInstance) {
    storageInstance = await initializeStorage();
  }
  return storageInstance;
}

/**
 * 上传图片到 Google Cloud Storage
 * 支持 Buffer 和 base64 字符串两种输入格式
 * 图片会自动存储在 images/ 子目录下
 */
export async function uploadImage(
  imageData: Buffer | string,
  fileName: string,
  bucketName?: string
): Promise<string> {
  try {
    const storage = await getStorage();
    const bucket = storage.bucket(bucketName || process.env.GCS_BUCKET_NAME!);
    
    // 为图片文件添加 images/ 子目录前缀
    const imageFileName = `images/${fileName}`;
    const file = bucket.file(imageFileName);

    // 将输入数据转换为 Buffer
    let imageBuffer: Buffer;
    if (typeof imageData === 'string') {
      // 如果是 base64 字符串，转换为 Buffer
      imageBuffer = Buffer.from(imageData, 'base64');
    } else {
      // 如果已经是 Buffer，直接使用
      imageBuffer = imageData;
    }

    // 压缩图片
    const compressedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // 上传文件
    await file.save(compressedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // 1年缓存
      },
    });

    // 注意：由于启用了 uniform bucket-level access，无法使用 makePublic()
    // 返回标准的 GCS URI 格式，签名 URL 将通过缓存函数按需生成
    const gcsUri = `gs://${bucket.name}/${imageFileName}`;
    const publicUrl = gcsUri;
    
    logger.info('图片上传成功', {
      fileName: imageFileName,
      bucketName: bucket.name,
      gcsUri: publicUrl, // 返回的是 GCS URI 格式，签名 URL 将按需生成
      originalSize: imageBuffer.length,
      compressedSize: compressedBuffer.length
    });

    return publicUrl;
  } catch (error) {
    logger.error('图片上传失败', { fileName, error });
    throw error;
  }
}

/**
 * 生成签名 URL
 */
export async function generateSignedUrl(
  fileName: string,
  bucketName?: string,
  options: Partial<GetSignedUrlConfig> = {}
): Promise<string> {
  try {
    const storage = await getStorage();
    const bucket = storage.bucket(bucketName || process.env.GCS_BUCKET_NAME!);
    const file = bucket.file(fileName);

    // GCS V4 签名URL最长有效期为 7 天（604800 秒）。
    // 通过环境变量 GCS_SIGNED_URL_TTL_SECONDS 配置期望 TTL，并在此处进行上限限制，确保不会超过协议约束。
    const MAX_V4_TTL_SECONDS = 604800; // 7 天
    const envTtl = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS || '3600'); // 默认1小时
    const ttlSeconds = Number.isFinite(envTtl) && envTtl > 0 ? Math.min(envTtl, MAX_V4_TTL_SECONDS) : 3600;

    const defaultOptions: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      // 若调用方未显式传入 expires，则使用可配置 TTL
      expires: options.expires ?? (Date.now() + ttlSeconds * 1000),
      ...options,
    };

    const [signedUrl] = await file.getSignedUrl(defaultOptions);
    
    logger.info('生成签名 URL 成功', {
      fileName,
      bucketName: bucket.name,
      expires: defaultOptions.expires,
      ttlSeconds,
    });

    return signedUrl;
  } catch (error) {
    logger.error('生成签名 URL 失败', { fileName, error });
    throw error;
  }
}

/**
 * 从 GCS URI 生成签名 URL
 * 
 * @param gcsUri GCS URI (例如: gs://bucket-name/path/to/file)
 * @param download 是否作为下载链接
 * @returns 签名 URL
 */
export async function getSignedUrlFromGCS(gcsUri: string, download: boolean = false): Promise<string> {
  const [bucketName, ...pathSegments] = gcsUri.replace("gs://", "").split("/");
  const fileName = pathSegments.join("/");
  
  try {
    // 使用 getStorage() 获取 storage 实例
    const storage = await getStorage();

    // 读取TTL并限制最大为7天
    const MAX_V4_TTL_SECONDS = 604800; // 7 天
    const envTtl = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS || '3600');
    const ttlSeconds = Number.isFinite(envTtl) && envTtl > 0 ? Math.min(envTtl, MAX_V4_TTL_SECONDS) : 3600;
    
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + ttlSeconds * 1000,
    };

    if (download) {
      options.responseDisposition = 'attachment';
    }

    // 尝试生成签名 URL
    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
    
    logger.info('从 GCS URI 生成签名 URL 成功', {
      gcsUri,
      bucketName,
      fileName,
      download,
      ttlSeconds,
      serviceAccount: process.env.SERVICE_ACCOUNT
    });
    
    return url;
  } catch (error) {
    // 详细记录错误信息，帮助诊断权限问题
    logger.error(`Failed to generate signed URL for ${gcsUri}, falling back to public URL:`, {
      error: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code,
      bucketName,
      fileName,
      serviceAccount: process.env.SERVICE_ACCOUNT,
      hasServiceAccount: !!process.env.SERVICE_ACCOUNT
    });
    
    // 备用方案：使用公共URL
    // 注意：这要求存储桶或文件是公开可访问的
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    logger.debug(`Using public URL fallback: ${publicUrl}`);
    return publicUrl;
  }
}

/**
 * 从 GCS URI 下载图片并返回 sharp 对象
 *
 * @param gcsUri Google Cloud Storage URI (例如: "gs://bucket-name/path/to/image.jpg")
 * @returns Promise 解析为 sharp 实例
 */
export async function gcsUriToSharp(gcsUri: string): Promise<sharp.Sharp> {
  try {
    // 1. 解析 GCS URI 提取存储桶名称和文件路径
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GCS URI format: ${gcsUri}`);
    }
    const bucketName = match[1];
    const filePath = match[2];

    // 2. 修复：使用 getStorage() 获取 storage 实例
    const storage = await getStorage();

    // 3. 从 GCS 下载图片文件到缓冲区
    logger.debug(`Downloading image from gs://${bucketName}/${filePath}`);
    const [buffer] = await storage.bucket(bucketName).file(filePath).download();
    logger.debug(`Image downloaded successfully (${buffer.length} bytes)`);

    // 4. 从下载的缓冲区创建 sharp 对象
    return sharp(buffer);

  } catch (error) {
    logger.error(`Error processing image from GCS URI ${gcsUri}:`, error);
    // 重新抛出错误，让调用者处理
    throw error;
  }
}

/**
 * 从 GCS URI 下载图片并返回 base64 编码字符串
 *
 * @param gcsUri Google Cloud Storage URI (例如: "gs://bucket-name/path/to/image.jpg")
 * @returns Promise 解析为 base64 数据字符串
 */
export async function gcsUriToBase64(gcsUri: string): Promise<string> {
  try {
    // 1. 解析 GCS URI
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GCS URI format: ${gcsUri}`);
    }
    const bucketName = match[1];
    const filePath = match[2];

    // 2. 修复：使用 getStorage() 获取 storage 实例
    const storage = await getStorage();

    // 3. 下载图片文件到缓冲区
    logger.debug(`Downloading image for base64 conversion from gs://${bucketName}/${filePath}`);
    const [buffer] = await storage.bucket(bucketName).file(filePath).download();
    logger.debug(`Image downloaded successfully (${buffer.length} bytes)`);

    // 4. 将缓冲区转换为 base64 字符串
    const base64Data = buffer.toString('base64');

    // 5. 返回 base64 数据（不包含 data URI 前缀）
    return base64Data;

  } catch (error) {
    logger.error(`Error converting GCS URI ${gcsUri} to base64:`, error);
    // 重新抛出错误，让调用者处理
    throw error;
  }
}

/**
 * 从 GCS URI 获取文件的 MIME 类型
 * 
 * @param gcsUri Google Cloud Storage URI
 * @returns Promise 解析为 MIME 类型字符串或 null
 */
export async function getMimeTypeFromGCS(gcsUri: string): Promise<string | null> {
  try {
    const [bucketName, ...pathSegments] = gcsUri.replace("gs://", "").split("/");
    const fileName = pathSegments.join("/");
    
    // 修复：使用 getStorage() 获取 storage 实例
    const storage = await getStorage();
    
    const [metadata] = await storage.bucket(bucketName).file(fileName).getMetadata();
    
    logger.debug('获取文件 MIME 类型成功', {
      gcsUri,
      bucketName,
      fileName,
      contentType: metadata.contentType
    });
    
    return metadata.contentType || null;
  } catch (error) {
    logger.error(`Error getting MIME type from GCS URI ${gcsUri}:`, error);
    throw error;
  }
}
