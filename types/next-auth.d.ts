// NextAuth 类型扩展
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      provider?: 'google' | 'credentials'
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username?: string
    provider?: 'google' | 'credentials'
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    username?: string
    provider?: 'google' | 'credentials'
    googleUserId?: string
  }
}