import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔐 API路由认证检查
  if (pathname.startsWith('/api/')) {
    // 不需要认证的API端点（公开端点）
    const publicApiRoutes = [
      '/api/auth',           // NextAuth相关端点
      '/api/auth/providers-status', // 认证提供商状态检查
      '/api/auth/register',  // 用户注册
    ]

    // 检查是否是公开API端点
    const isPublicApi = publicApiRoutes.some(route => 
      pathname.startsWith(route)
    )

    if (!isPublicApi) {
      // 对于需要认证的API端点，使用 NextAuth 的 JWT token 检查
      // 这避免了在 Edge Runtime 中使用 Firestore
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token?.sub) {
        return NextResponse.json(
          { error: '请先登录后再访问此功能' },
          { status: 401 }
        )
      }
    }
  }

  // 🔐 页面路由认证检查（由NextAuth的authorized回调处理）
  // 这里只做基本的请求处理
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}