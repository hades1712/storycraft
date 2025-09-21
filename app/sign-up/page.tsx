"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"

interface UsernameCheckResult {
  available: boolean
  message: string
}

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheckResult | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    secret: "" // 用户自定义的注册密钥，用作密码加密的盐值
  })
  
  const router = useRouter()

  // 防抖检查用户名可用性
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameCheck(null)
        return
      }

      setIsCheckingUsername(true)
      try {
        const response = await fetch(`/api/auth/register?username=${encodeURIComponent(formData.username)}`)
        const result = await response.json()
        setUsernameCheck(result)
      } catch (error) {
        console.error("检查用户名失败:", error)
        setUsernameCheck({ available: false, message: "检查失败" })
      } finally {
        setIsCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.username])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 基本验证
    if (!formData.username || !formData.password || !formData.confirmPassword || !formData.secret) {
      setError("请填写所有必填字段")
      return
    }

    // 用户名验证
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError("用户名长度必须在3-20位之间")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("用户名只能包含字母、数字和下划线")
      return
    }

    // 密码验证 - 简化验证，任意密码都可以
    if (formData.password.length === 0) {
      setError("请输入密码")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    if (usernameCheck && !usernameCheck.available) {
      setError("用户名不可用")
      return
    }

    try {
      setIsLoading(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "注册失败")
      }

      setSuccess("注册成功！正在跳转到登录页面...")
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        router.push("/sign-in")
      }, 2000)

    } catch (error) {
      console.error("注册失败:", error)
      setError(error instanceof Error ? error.message : "注册失败，请稍后重试")
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
    if (success) setSuccess("")
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            创建账户
          </CardTitle>
          <CardDescription className="text-center">
            填写信息创建您的账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名输入 */}
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="3-20位字母、数字或下划线"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                {formData.username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isCheckingUsername ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : usernameCheck ? (
                      usernameCheck.available ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )
                    ) : null}
                  </div>
                )}
              </div>
              {usernameCheck && formData.username.length >= 3 && (
                <p className={`text-sm ${usernameCheck.available ? 'text-green-600' : 'text-red-600'}`}>
                  {usernameCheck.message}
                </p>
              )}
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
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

            {/* 确认密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-red-600">密码不一致</p>
              )}
            </div>

            {/* 注册密钥输入 */}
            <div className="space-y-2">
              <Label htmlFor="secret">注册密钥 *</Label>
              <Input
                id="secret"
                name="secret"
                type="password"
                placeholder="请输入注册密钥"
                value={formData.secret}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                此密钥用于验证您是否有权限注册账户
              </p>
            </div>

            {/* 提交按钮 */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (usernameCheck !== null && !usernameCheck.available)}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              创建账户
            </Button>
          </form>

          {/* 登录链接 */}
          <div className="text-center text-sm mt-4">
            <span className="text-gray-600">已有账户？</span>{" "}
            <Link
              href="/sign-in"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              立即登录
            </Link>
          </div>

          {/* 错误和成功提示 */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}