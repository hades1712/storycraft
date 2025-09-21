'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from './error-toast'

interface ToastContextType {
  showError: (title: string, message?: string, duration?: number) => string
  showSuccess: (title: string, message?: string, duration?: number) => string
  showInfo: (title: string, message?: string, duration?: number) => string
  handleApiError: (error: any, defaultMessage?: string) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const {
    toasts,
    showError,
    showSuccess,
    showInfo,
    handleApiError,
    removeToast,
    clearToasts
  } = useToast()

  const contextValue: ToastContextType = {
    showError,
    showSuccess,
    showInfo,
    handleApiError,
    removeToast,
    clearToasts
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}