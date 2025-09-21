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
 */
async function initializeStorage(): Promise<Storage> {
  try {
    // 初始化 Storage
    // Storage 客户端会自动使用 Application Default Credentials (ADC)
    // 在 Cloud Run 中会使用服务账号，在本地会使用 GOOGLE_APPLICATION_CREDENTIALS
    const storage = new Storage({
      projectId: process.env.PROJECT_ID,
    });

    logger.info('Google Cloud Storage 客户端初始化成功', {
      projectId: process.env.PROJECT_ID
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

// 存储配置
const storageUri = process.env.GCS_VIDEOS_STORAGE_URI;

/**
 * 上传图片到 Google Cloud Storage
 * 支持 Buffer 和 base64 字符串两种输入格式
 */
export async function uploadImage(
  imageData: Buffer | string,
  fileName: string,
  bucketName?: string
): Promise<string> {
  try {
    const storage = await getStorage();
    const bucket = storage.bucket(bucketName || process.env.GCS_BUCKET_NAME!);
    const file = bucket.file(fileName);

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
    const gcsUri = `gs://${bucket.name}/${fileName}`;
    const publicUrl = gcsUri;
    
    logger.info('图片上传成功', {
      fileName,
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

    const defaultOptions: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15分钟
      ...options,
    };

    const [signedUrl] = await file.getSignedUrl(defaultOptions);
    
    logger.info('生成签名 URL 成功', {
      fileName,
      bucketName: bucket.name,
      expires: defaultOptions.expires
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
    // 修复：使用 getStorage() 获取 storage 实例
    const storage = await getStorage();
    
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1小时过期
    };

    if (download) {
      options.responseDisposition = 'attachment';
    }

    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
    
    logger.info('从 GCS URI 生成签名 URL 成功', {
      gcsUri,
      bucketName,
      fileName,
      download
    });
    
    return url;
  } catch (error) {
    logger.error(`Failed to generate signed URL for ${gcsUri}, falling back to public URL:`, error);
    
    // 备用方案：尝试使用公共URL
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
