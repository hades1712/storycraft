import { useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import { useToast } from './use-toast'
import type { Scenario } from '@/app/types'

export function useScenario() {
  const { session, isValidAuth, authError } = useAuth()
  const { handleApiError, showSuccess } = useToast()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentScenarioIdRef = useRef<string | null>(null)

  const saveScenario = useCallback(async (scenario: Scenario, scenarioId?: string) => {
    if (!session?.user?.id) {
      const errorMsg = 'Cannot save scenario: user not authenticated'
      console.warn(errorMsg)
      handleApiError(new Error(errorMsg), '保存场景失败')
      return null
    }

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          scenarioId: scenarioId || currentScenarioIdRef.current
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save scenario')
      }

      const result = await response.json()
      
      // Update the current scenario ID for future saves
      if (result.scenarioId) {
        currentScenarioIdRef.current = result.scenarioId
      }

      showSuccess('场景保存成功', `场景"${scenario.name}"已成功保存`)
      return result.scenarioId
    } catch (error) {
      console.error('Error saving scenario:', error)
      handleApiError(error, '保存场景失败')
      throw error
    }
  }, [session?.user?.id, handleApiError, showSuccess])

  // 防抖保存函数 - 优化版本
  const saveScenarioDebounced = useCallback(
    (scenario: Scenario) => {
      // 检查是否需要保存（避免不必要的API调用）
      if (!scenario || !scenario.name?.trim()) {
        console.log('[useScenario] 跳过保存：场景为空或名称为空')
        return
      }

      // 检查认证状态
      if (!session?.user?.id) {
        console.log('[useScenario] 跳过保存：用户未认证')
        return
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('[useScenario] 开始防抖保存场景:', scenario.name)
          await saveScenario(scenario)
          console.log('[useScenario] 防抖保存成功')
        } catch (error) {
          console.error('[useScenario] 防抖保存失败:', error)
          handleApiError(error, '场景自动保存失败')
        }
      }, 2000) // 增加到2秒防抖，减少频繁保存
    },
    [saveScenario, session?.user?.id]
  )

  const loadScenario = useCallback(async (scenarioId: string): Promise<Scenario | null> => {
    if (!session?.user?.id) {
      const errorMsg = 'Cannot load scenario: user not authenticated'
      console.warn(errorMsg)
      handleApiError(new Error(errorMsg), '加载场景失败')
      return null
    }

    try {
      const response = await fetch(`/api/scenarios?id=${scenarioId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to load scenario')
      }

      const scenarioData = await response.json()
      
      // Update current scenario ID
      currentScenarioIdRef.current = scenarioId
      
      return scenarioData
    } catch (error) {
      console.error('Error loading scenario:', error)
      handleApiError(error, '加载场景失败')
      throw error
    }
  }, [session?.user?.id, handleApiError])

  const loadUserScenarios = useCallback(async () => {
    if (!session?.user?.id) {
      const errorMsg = 'Cannot load scenarios: user not authenticated'
      console.warn(errorMsg)
      handleApiError(new Error(errorMsg), '加载场景列表失败')
      return []
    }

    try {
      const response = await fetch('/api/scenarios')
      
      if (!response.ok) {
        throw new Error('Failed to load scenarios')
      }

      const result = await response.json()
      return result.scenarios || []
    } catch (error) {
      console.error('Error loading user scenarios:', error)
      handleApiError(error, '加载场景列表失败')
      throw error
    }
  }, [session?.user?.id, handleApiError])

  const getCurrentScenarioId = useCallback(() => {
    return currentScenarioIdRef.current
  }, [])

  const setCurrentScenarioId = useCallback((scenarioId: string | null) => {
    currentScenarioIdRef.current = scenarioId
  }, [])

  return {
    saveScenario,
    saveScenarioDebounced,
    loadScenario,
    loadUserScenarios,
    getCurrentScenarioId,
    setCurrentScenarioId,
    isAuthenticated: !!session?.user?.id,
    isValidAuth
  }
}