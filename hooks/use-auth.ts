import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()

  useEffect(() => {
    // When user is authenticated, ensure they exist in Firestore
    if (status === 'authenticated' && session?.user?.id) {
      const createOrUpdateUser = async () => {
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        } catch (error) {
          console.error('Failed to create/update user:', error)
        }
      }

      createOrUpdateUser()
    }
  }, [status, session?.user?.id])

  return { session, status }
}