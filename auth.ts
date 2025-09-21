import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { UserService } from "./lib/user-service"
import { z } from "zod"

// 验证必需的环境变量
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 环境变量未设置')
}

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    console.warn('Google OAuth 环境变量未设置，Google 登录将不可用')
}

// 登录表单验证 schema
const loginSchema = z.object({
    username: z.string().min(3, "用户名至少3位").max(20, "用户名最多20位"),
    password: z.string().min(8, "密码至少8位")
})

export const authConfig = {
    // 指定自定义登录页面
    pages: {
        signIn: "/sign-in",
    },
    callbacks: {
        // 授权回调 - 控制页面访问权限
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnSignIn = nextUrl.pathname.startsWith("/sign-in")

            if (isLoggedIn) {
                if (isOnSignIn) {
                    // 已登录用户访问登录页面，重定向到首页
                    return Response.redirect(new URL("/", nextUrl))
                }
                return true
            }

            if (isOnSignIn) {
                // 未登录用户可以访问登录页面
                return true
            }

            // 未登录用户访问其他页面，重定向到登录页面
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
        
        // 用户名密码提供商
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
                try {
                    // 1. 验证输入格式
                    const validatedFields = loginSchema.safeParse(credentials)
                    if (!validatedFields.success) {
                        console.error('登录表单验证失败:', validatedFields.error.flatten().fieldErrors)
                        return null
                    }

                    const { username, password } = validatedFields.data

                    // 2. 验证用户凭据
                    const user = await UserService.authenticateUser({ username, password })
                    
                    // 3. 返回用户信息（NextAuth 需要的格式）
                    return {
                        id: username,
                        name: user.displayName,
                        email: user.email || null,
                        image: user.photoURL || null,
                        username: username,
                        provider: 'credentials'
                    }
                } catch (error) {
                    console.error('用户认证失败:', error)
                    return null
                }
            }
        })
    ],
} satisfies NextAuthConfig

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)