import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useToast } from './use-toast'

export function useAuth() {
  const { data: session, status } = useSession()
  const { handleApiError, showSuccess } = useToast()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isUserSynced, setIsUserSynced] = useState(false)

  useEffect(() => {
    // 重置错误状态
    if (status === 'loading') {
      setAuthError(null)
    }

    // 当用户认证成功时，确保用户信息在 Firestore 中存在
    if (status === 'authenticated' && session?.user && !isUserSynced) {
      const createOrUpdateUser = async () => {
        try {
          console.log('[useAuth] 开始同步用户信息:', session.user?.id)
          
          // 根据不同的认证提供商处理用户信息
          if (session.user.provider === 'google') {
            // Google 用户：调用现有的用户创建/更新 API
            const response = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

            if (!response.ok) {
              throw new Error(`用户同步失败: ${response.status}`)
            }

            console.log('[useAuth] Google用户同步成功')
            showSuccess('登录成功', '用户信息已同步')
          } else if (session.user.provider === 'credentials') {
            // 用户名密码用户：用户信息已在登录时创建，这里可以更新最后登录时间
            console.log('[useAuth] 用户名密码登录用户已认证:', session.user.id)
            showSuccess('登录成功', '欢迎回来！')
            // 可以在这里添加额外的用户信息同步逻辑
          }

          setIsUserSynced(true)
          setAuthError(null)
        } catch (error) {
          console.error('[useAuth] 创建/更新用户失败:', error)
          const errorMessage = error instanceof Error ? error.message : '用户同步失败'
          setAuthError(errorMessage)
          handleApiError(error, '用户认证失败')
        }
      }

      createOrUpdateUser()
    }

    // 当用户登出时重置状态
    if (status === 'unauthenticated') {
      setIsUserSynced(false)
      setAuthError(null)
    }
  }, [status, session?.user?.id, session?.user?.provider, isUserSynced])

  // 检查认证状态是否有效
  const isValidAuth = status === 'authenticated' && 
                      session?.user?.id && 
                      isUserSynced && 
                      !authError

  return { 
    session, 
    status,
    authError,
    isUserSynced,
    // 添加一些便捷的状态判断
    isAuthenticated: status === 'authenticated',
    isValidAuth, // 更严格的认证检查
    isLoading: status === 'loading',
    user: session?.user,
    userId: session?.user?.id,
    userProvider: session?.user?.provider
  }
}

// 导出类型定义，方便其他组件使用
export type AuthUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  provider?: 'google' | 'credentials'
}