"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"

// 定义可用的认证提供商类型
interface AuthProviders {
  google: boolean
  credentials: boolean
}

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  })
  const [providers, setProviders] = useState<AuthProviders>({
    google: false,
    credentials: true // 用户名密码登录始终可用
  })
  const [isLoadingProviders, setIsLoadingProviders] = useState(true)
  const router = useRouter()

  // 检查可用的认证提供商
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers-status')
        if (response.ok) {
          const data = await response.json()
          setProviders(data)
        }
      } catch (error) {
        console.error('检查认证提供商失败:', error)
        // 如果检查失败，默认只显示用户名密码登录
        setProviders({ google: false, credentials: true })
      } finally {
        setIsLoadingProviders(false)
      }
    }

    checkProviders()
  }, [])

  // 处理 Google 登录
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError("")
      await signIn("google", { callbackUrl: "/" })
    } catch (error) {
      console.error("Google 登录失败:", error)
      setError("Google 登录失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理用户名密码登录
  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      setError("请填写用户名和密码")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const result = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError("用户名或密码错误")
      } else if (result?.ok) {
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      console.error("登录失败:", error)
      setError("登录失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除错误信息
    if (error) setError("")
  }

  // 计算可用的认证方式数量
  const availableProviders = Object.values(providers).filter(Boolean).length
  const hasMultipleProviders = availableProviders > 1

  // 确定默认标签页
  const defaultTab = providers.google ? "google" : "credentials"

  if (isLoadingProviders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">加载中...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            欢迎回来
          </CardTitle>
          <CardDescription className="text-center">
            {hasMultipleProviders ? "选择您的登录方式" : "请登录您的账户"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasMultipleProviders ? (
            // 多种登录方式 - 使用标签页
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                {providers.google && (
                  <TabsTrigger value="google">Google 登录</TabsTrigger>
                )}
                {providers.credentials && (
                  <TabsTrigger value="credentials">账号登录</TabsTrigger>
                )}
              </TabsList>
              
              {/* Google 登录标签页 */}
              {providers.google && (
                <TabsContent value="google" className="space-y-4">
                  <div className="text-center text-sm text-gray-600 mb-4">
                    使用您的 Google 账户快速登录
                  </div>
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    使用 Google 登录
                  </Button>
                </TabsContent>
              )}

              {/* 用户名密码登录标签页 */}
              {providers.credentials && (
                <TabsContent value="credentials" className="space-y-4">
                  <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="请输入用户名"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="请输入密码"
                          value={formData.password}
                          onChange={handleInputChange}
                          disabled={isLoading}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      登录
                    </Button>
                  </form>

                  <div className="text-center text-sm">
                    <span className="text-gray-600">还没有账户？</span>{" "}
                    <Link
                      href="/sign-up"
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      立即注册
                    </Link>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          ) : (
            // 单一登录方式 - 直接显示表单
            <div className="space-y-4">
              {providers.google && (
                <>
                  <div className="text-center text-sm text-gray-600 mb-4">
                    使用您的 Google 账户登录
                  </div>
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    使用 Google 登录
                  </Button>
                </>
              )}

              {providers.credentials && (
                <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="请输入用户名"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入密码"
                        value={formData.password}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    登录
                  </Button>

                  <div className="text-center text-sm">
                    <span className="text-gray-600">还没有账户？</span>{" "}
                    <Link
                      href="/sign-up"
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      立即注册
                    </Link>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}