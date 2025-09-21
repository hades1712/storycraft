import { NextRequest, NextResponse } from 'next/server'
import { firestore } from '@/lib/firestore'
import { auth } from '@/auth'
import { Timestamp } from '@google-cloud/firestore'
import type { FirestoreUser } from '@/types/firestore'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email
    const displayName = session.user.name || userEmail.split('@')[0]
    const photoURL = session.user.image || ''

    // Check if user already exists
    const userRef = firestore.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      // User exists, update their information
      await userRef.update({
        displayName,
        photoURL,
        // Don't update createdAt
      })

      const updatedUserData = await userRef.get()
      return NextResponse.json({
        id: userId,
        ...updatedUserData.data()
      })
    } else {
      // Create new user
      const newUser: FirestoreUser = {
        email: userEmail,
        displayName,
        photoURL,
        provider: 'google', // 使用 Google 认证提供商
        isActive: true,     // 新用户默认激活
        createdAt: Timestamp.now(),
      }

      await userRef.set(newUser)

      return NextResponse.json({
        id: userId,
        ...newUser
      })
    }
  } catch (error) {
    console.error('Error managing user:', error)
    return NextResponse.json(
      { error: 'Failed to manage user' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userRef = firestore.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: userId,
      ...userDoc.data()
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}