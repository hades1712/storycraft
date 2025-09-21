import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/user-service'
import { z } from 'zod'

// 注册请求验证 schema
const registerSchema = z.object({
    username: z.string()
        .min(3, "用户名至少3位")
        .max(20, "用户名最多20位")
        .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    password: z.string()
        .min(8, "密码至少8位")
        .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "密码必须包含字母和数字"),
    confirmPassword: z.string(),
    secret: z.string()
        .min(6, "注册密钥至少6位")
        .max(50, "注册密钥最多50位")
}).refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"]
})

/**
 * 用户注册 API
 * POST /api/auth/register
 */
export async function POST(request: NextRequest) {
    try {
        // 1. 解析请求体
        const body = await request.json()
        
        // 2. 验证输入数据
        const validationResult = registerSchema.safeParse(body)
        if (!validationResult.success) {
            // 提取第一个验证错误作为主要错误信息
            const errors = validationResult.error.flatten().fieldErrors
            const firstError = Object.values(errors)[0]?.[0] || "输入数据验证失败"
            
            console.log('注册验证失败:', {
                body,
                errors,
                firstError
            })
            
            return NextResponse.json(
                { 
                    error: firstError,
                    details: errors 
                },
                { status: 400 }
            )
        }

        const { username, password, secret } = validationResult.data

        // 3. 检查用户名是否可用
        const isAvailable = await UserService.isUsernameAvailable(username)
        if (!isAvailable) {
            return NextResponse.json(
                { error: "用户名已存在" },
                { status: 409 }
            )
        }

        // 4. 创建用户（使用用户名作为显示名称）
        const newUser = await UserService.registerUser({
            username,
            password,
            displayName: username,
            secret  // 传递用户自定义的注册密钥
        })

        // 5. 返回成功响应（不包含敏感信息）
        return NextResponse.json({
            message: "注册成功",
            user: {
                username: newUser.username,
                displayName: newUser.displayName,
                photoURL: newUser.photoURL,
                createdAt: newUser.createdAt
            }
        }, { status: 201 })

    } catch (error) {
        console.error('用户注册失败:', error)
        
        // 处理已知错误
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        // 处理未知错误
        return NextResponse.json(
            { error: "注册失败，请稍后重试" },
            { status: 500 }
        )
    }
}

/**
 * 检查用户名可用性 API
 * GET /api/auth/register?username=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username')

        if (!username) {
            return NextResponse.json(
                { error: "用户名参数缺失" },
                { status: 400 }
            )
        }

        // 验证用户名格式
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return NextResponse.json({
                available: false,
                message: "用户名格式不正确"
            })
        }

        // 检查可用性
        const isAvailable = await UserService.isUsernameAvailable(username)
        
        return NextResponse.json({
            available: isAvailable,
            message: isAvailable ? "用户名可用" : "用户名已存在"
        })

    } catch (error) {
        console.error('检查用户名可用性失败:', error)
        return NextResponse.json(
            { error: "检查失败，请稍后重试" },
            { status: 500 }
        )
    }
}