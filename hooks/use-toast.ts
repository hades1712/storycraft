import { useState, useCallback } from 'react'
import { Toast, ToastType } from '@/components/error-toast'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  // 添加 Toast
  const addToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration: duration || (type === 'error' ? 8000 : 5000) // 错误消息显示更久
    }

    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  // 移除 Toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // 清除所有 Toast
  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // 便捷方法
  const showError = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('error', title, message, duration)
  }, [addToast])

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('success', title, message, duration)
  }, [addToast])

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('info', title, message, duration)
  }, [addToast])

  // 处理 API 错误的便捷方法
  const handleApiError = useCallback((error: any, defaultMessage = '操作失败') => {
    let title = defaultMessage
    let message = ''

    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else if (error?.message) {
      message = error.message
    }

    // 根据错误类型提供更友好的提示
    if (message.includes('401') || message.includes('Unauthorized')) {
      title = '认证失败'
      message = '请重新登录后再试'
    } else if (message.includes('403') || message.includes('Forbidden')) {
      title = '权限不足'
      message = '您没有权限执行此操作'
    } else if (message.includes('404') || message.includes('Not Found')) {
      title = '资源不存在'
      message = '请求的资源未找到'
    } else if (message.includes('500') || message.includes('Internal Server Error')) {
      title = '服务器错误'
      message = '服务器出现问题，请稍后再试'
    }

    return showError(title, message)
  }, [showError])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showError,
    showSuccess,
    showInfo,
    handleApiError
  }
}