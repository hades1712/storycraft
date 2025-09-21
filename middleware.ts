import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔐 API路由认证检查
  if (pathname.startsWith('/api/')) {
    // 公开API端点，无需认证
    const publicApiRoutes = [
      '/api/auth',
      '/api/health'
    ]

    // 检查是否是公开API端点
    const isPublicApi = publicApiRoutes.some(route => 
      pathname.startsWith(route)
    )

    if (!isPublicApi) {
      try {
        // 对于需要认证的API端点，使用 NextAuth 的 JWT token 检查
        // 这避免了在 Edge Runtime 中使用 Firestore
        const token = await getToken({ 
          req: request,
          // 同时兼容 AUTH_SECRET 与 NEXTAUTH_SECRET，确保与 Auth.js v5 配置一致
          secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
        })
        
        // 更详细的token验证
        if (!token) {
          console.log(`[Middleware] 未找到token，路径: ${pathname}`)
          return NextResponse.json(
            { 
              error: '请先登录后再访问此功能',
              code: 'NO_TOKEN',
              path: pathname
            },
            { status: 401 }
          )
        }

        // 检查token是否有效（包含必要的字段）
        if (!token.sub && !token.googleUserId && !token.username) {
          console.log(`[Middleware] Token无效，缺少用户标识，路径: ${pathname}`, token)
          return NextResponse.json(
            { 
              error: '认证信息无效，请重新登录',
              code: 'INVALID_TOKEN',
              path: pathname
            },
            { status: 401 }
          )
        }

        // 添加用户信息到请求头，供API路由使用
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', token.sub || token.googleUserId || token.username || '')
        requestHeaders.set('x-user-provider', token.provider || 'unknown')

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })

      } catch (error) {
        console.error(`[Middleware] Token验证失败，路径: ${pathname}`, error)
        return NextResponse.json(
          { 
            error: '认证验证失败，请重新登录',
            code: 'AUTH_ERROR',
            path: pathname
          },
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