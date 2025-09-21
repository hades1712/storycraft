import { Firestore } from '@google-cloud/firestore';
import { createGoogleAuth } from './auth-helper';
import logger from '@/app/logger';

/**
 * 初始化 Firestore 客户端
 * 
 * 使用智能认证策略：
 * - Cloud Run: 使用 ADC（服务账号自动认证）
 * - 本地开发: 使用 GOOGLE_APPLICATION_CREDENTIALS 文件
 */
async function initializeFirestore(): Promise<Firestore> {
  try {
    // 初始化 Firestore
    // Firestore 客户端会自动使用 Application Default Credentials (ADC)
    // 在 Cloud Run 中会使用服务账号，在本地会使用 GOOGLE_APPLICATION_CREDENTIALS
    const firestore = new Firestore({
      projectId: process.env.PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID,
      // 连接池设置
      maxIdleTime: 0,
      maxConcurrency: 100,
      keepAlive: true,
    });

    logger.info('Firestore 客户端初始化成功', {
      projectId: process.env.PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID
    });

    return firestore;
  } catch (error) {
    logger.error('Firestore 初始化失败', error);
    throw error;
  }
}

// 创建单例实例
let firestoreInstance: Firestore | null = null;

/**
 * 获取 Firestore 实例（单例模式）
 */
export async function getFirestore(): Promise<Firestore> {
  if (!firestoreInstance) {
    firestoreInstance = await initializeFirestore();
  }
  return firestoreInstance;
}

/**
 * 同步获取 Firestore 实例
 * 注意：这个函数假设 Firestore 已经初始化
 * 如果未初始化，会抛出错误
 */
export function getFirestoreSync(): Firestore {
  if (!firestoreInstance) {
    throw new Error('Firestore 尚未初始化，请先调用 getFirestore() 或 initializeFirestoreSync()');
  }
  return firestoreInstance;
}

/**
 * 同步初始化 Firestore（用于向后兼容）
 */
export function initializeFirestoreSync(): Firestore {
  if (!firestoreInstance) {
    // 同步初始化 Firestore
    firestoreInstance = new Firestore({
      projectId: process.env.PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID,
      // 连接池设置
      maxIdleTime: 0,
      maxConcurrency: 100,
      keepAlive: true,
    });

    logger.info('Firestore 客户端同步初始化成功', {
      projectId: process.env.PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID
    });
  }
  return firestoreInstance;
}

// 为了向后兼容，导出默认实例（同步初始化）
export const firestore = initializeFirestoreSync();