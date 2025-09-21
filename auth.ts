import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { UserService } from "./lib/user-service"
import { z } from "zod"

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required in production')
}

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  // 可选：仅提示，不阻断启动
  // console.warn('Google OAuth not fully configured, only credentials login will be available.')
}

const loginSchema = z.object({
    username: z.string().min(3, "用户名至少3位").max(20, "用户名最多20位"),
    password: z.string().min(8, "密码至少8位")
})

export const authConfig = {
    // 指定自定义登录页面
    pages: {
        signIn: "/sign-in",
    },
    // 在反向代理/Cloud Run 等场景下，信任 X-Forwarded-* 头，确保生成正确的回调与 Cookie 域
    trustHost: true,
    // 明确使用 JWT 会话，避免数据库会话导致的 Cookie 行为差异
    session: {
        strategy: 'jwt',
    },
    // 显式设置会话 Cookie（v5 默认名为 authjs.session-token）
    // 这里不设置 domain，保持 host-only，确保在代理域名下也能被发送
    cookies: {
        sessionToken: {
            name: 'authjs.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true,
            },
        },
    },
    callbacks: {
        // 授权回调 - 控制页面访问权限
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnSignIn = nextUrl.pathname.startsWith("/sign-in")
            const isOnSignUp = nextUrl.pathname.startsWith("/sign-up")
            
            // 公共路径 - 不需要认证的页面
            const publicPaths = ["/sign-in", "/sign-up", "/api/auth"]
            const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path))

            // 已登录用户的处理
            if (isLoggedIn) {
                if (isOnSignIn || isOnSignUp) {
                    // 已登录用户访问登录/注册页面，重定向到首页
                    return Response.redirect(new URL("/", nextUrl.origin))
                }
                // 已登录用户可以访问所有其他页面
                return true
            }

            // 未登录用户的处理
            if (isPublicPath) {
                // 未登录用户可以访问公共页面（登录、注册、认证API）
                return true
            }

            // 未登录用户访问受保护页面，重定向到登录页面
            return false
        },
        
        // JWT 回调 - 处理 token 信息
        async jwt({ token, profile, account, user }) {
            // Google 登录处理
            if (profile && account?.provider === 'google') {
                const googleProfile = profile as { picture?: string };
                if (googleProfile.picture) {
                    token.picture = googleProfile.picture
                }
                
                // 存储 Google 的稳定用户 ID
                if (account.providerAccountId) {
                    token.googleUserId = account.providerAccountId
                    token.provider = 'google'
                }
            }
            
            // Credentials 登录处理
            if (user && account?.provider === 'credentials') {
                token.username = (user as any).username
                token.provider = 'credentials'
                token.picture = user.image
            }
            
            return token
        },
        
        // Session 回调 - 处理 session 信息
        async session({ session, token }) {
            if (session.user) {
                // 设置用户头像
                if (token?.picture) {
                    session.user.image = token.picture as string;
                }
                
                // 根据提供商类型设置用户 ID
                if (token?.provider === 'google' && token?.googleUserId) {
                    session.user.id = token.googleUserId as string;
                } else if (token?.provider === 'credentials' && token?.username) {
                    session.user.id = token.username as string;
                } else if (token?.sub) {
                    // 后备方案：使用 NextAuth 的内部 ID
                    session.user.id = token.sub;
                }
                
                // 添加提供商信息到 session
                (session.user as any).provider = token?.provider as 'google' | 'credentials';
            }
            
            return session
        },
    },
    providers: [
        // Google OAuth 提供商（仅在环境变量存在时启用）
        ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [
            Google({
                clientId: process.env.AUTH_GOOGLE_ID,
                clientSecret: process.env.AUTH_GOOGLE_SECRET,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code"
                    }
                }
            })
        ] : []),
        
        Credentials({
            name: "credentials",
            credentials: {
                username: { 
                    label: "用户名", 
                    type: "text", 
                    placeholder: "请输入用户名" 
                },
                password: { 
                    label: "密码", 
                    type: "password", 
                    placeholder: "请输入密码" 
                }
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials)
                if (!parsed.success) {
                    return null
                }
                const { username, password } = parsed.data
                // 使用实际存在的用户认证服务方法
                const user = await UserService.authenticateUser({ username, password })
                if (!user) return null
                // 返回包含 username 与 provider，用于后续 JWT/Session 回调
                return {
                    id: user.id ?? username,
                    name: user.displayName ?? username,
                    username,
                    provider: 'credentials' as const,
                    image: (user as any).photoURL ?? undefined,
                }
            }
        })
    ],
} satisfies NextAuthConfig

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)