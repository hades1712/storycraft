import { NextResponse } from 'next/server'

/**
 * 检查可用的认证提供商
 * 
 * 这个 API 端点用于前端动态检查哪些认证方式可用，
 * 以便根据环境配置智能显示登录选项
 */
export async function GET() {
  try {
    // 检查 Google OAuth 是否配置
    const hasGoogleAuth = !!(
      process.env.AUTH_GOOGLE_ID && 
      process.env.AUTH_GOOGLE_SECRET &&
      // 确保不是占位符值
      process.env.AUTH_GOOGLE_ID !== 'your-google-client-id.apps.googleusercontent.com' &&
      process.env.AUTH_GOOGLE_SECRET !== 'your-google-client-secret'
    )

    // 用户名密码认证始终可用（因为我们已经实现了完整的用户服务）
    const hasCredentialsAuth = true

    const providers = {
      google: hasGoogleAuth,
      credentials: hasCredentialsAuth
    }

    return NextResponse.json(providers)
  } catch (error) {
    console.error('检查认证提供商失败:', error)
    
    // 发生错误时，返回安全的默认配置
    return NextResponse.json({
      google: false,
      credentials: true
    })
  }
}