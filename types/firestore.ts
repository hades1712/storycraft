import { ImagePrompt, VideoPrompt } from '../app/types'

// 扩展用户模型以支持多种认证方式
export interface FirestoreUser {
    id?: string                      // 文档 ID（可选）
    email?: string                    // Google 登录时的邮箱（可选）
    displayName: string              // 显示名称
    username?: string                // 用户名登录时的用户名（可选）
    passwordHash?: string            // 密码哈希（仅用户名登录时存在）
    provider: 'google' | 'credentials' // 认证提供商类型
    createdAt: FirebaseFirestore.Timestamp | Date | any
    updatedAt?: FirebaseFirestore.Timestamp | Date | any // 更新时间
    photoURL?: string                // 头像URL（可选）
    isActive: boolean                // 账户是否激活
    lastLoginAt?: FirebaseFirestore.Timestamp | Date | any // 最后登录时间
}

// 用户注册请求接口
export interface UserRegistrationRequest {
    username: string
    password: string
    displayName: string
    secret: string  // 注册密钥，用于验证用户是否有权限注册
}

// 用户登录请求接口
export interface UserLoginRequest {
    username: string
    password: string
}

export interface FirestoreScenario {
    id: string
    userId: string
    name: string
    pitch: string
    scenario: string
    style: string
    genre: string
    mood: string
    music: string
    musicUrl?: string
    language: {
      name: string
      code: string
    }
    characters: Array<{ name: string, description: string, imageGcsUri?: string }>
    props: Array<{ name: string, description: string, imageGcsUri?: string }>
    settings: Array<{ name: string, description: string, imageGcsUri?: string }>
    logoOverlay?: string
    scenes: Array<{
      imagePrompt: ImagePrompt
      videoPrompt: VideoPrompt
      description: string
      voiceover: string
      charactersPresent: string[]
      imageGcsUri?: string
      videoUri?: string
      voiceoverAudioUri?: string
      errorMessage?: string
    }>
    createdAt: FirebaseFirestore.Timestamp | Date | any
    updatedAt: FirebaseFirestore.Timestamp | Date | any
}