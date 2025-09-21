import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()

  useEffect(() => {
    // 当用户认证成功时，确保用户信息在 Firestore 中存在
    if (status === 'authenticated' && session?.user) {
      const createOrUpdateUser = async () => {
        try {
          // 根据不同的认证提供商处理用户信息
          if (session.user.provider === 'google') {
            // Google 用户：调用现有的用户创建/更新 API
            await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
          } else if (session.user.provider === 'credentials') {
            // 用户名密码用户：用户信息已在登录时创建，这里可以更新最后登录时间
            console.log('用户名密码登录用户已认证:', session.user.id)
            // 可以在这里添加额外的用户信息同步逻辑
          }
        } catch (error) {
          console.error('创建/更新用户失败:', error)
        }
      }

      createOrUpdateUser()
    }
  }, [status, session?.user?.id, session?.user?.provider])

  return { 
    session, 
    status,
    // 添加一些便捷的状态判断
    isAuthenticated: status === 'authenticated',
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