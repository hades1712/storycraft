import { useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import type { Scenario } from '@/app/types'

export function useScenario() {
  const { session } = useAuth()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentScenarioIdRef = useRef<string | null>(null)

  const saveScenario = useCallback(async (scenario: Scenario, scenarioId?: string) => {
    if (!session?.user?.id) {
      console.warn('Cannot save scenario: user not authenticated')
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

      return result.scenarioId
    } catch (error) {
      console.error('Error saving scenario:', error)
      throw error
    }
  }, [session?.user?.id])

  const saveScenarioDebounced = useCallback((scenario: Scenario, scenarioId?: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveScenario(scenario, scenarioId).catch(error => {
        console.error('Debounced save failed:', error)
      })
    }, 1000) // Wait 1 second after last change before saving
  }, [saveScenario])

  const loadScenario = useCallback(async (scenarioId: string): Promise<Scenario | null> => {
    if (!session?.user?.id) {
      console.warn('Cannot load scenario: user not authenticated')
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
      throw error
    }
  }, [session?.user?.id])

  const loadUserScenarios = useCallback(async () => {
    if (!session?.user?.id) {
      console.warn('Cannot load scenarios: user not authenticated')
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
      throw error
    }
  }, [session?.user?.id])

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
    isAuthenticated: !!session?.user?.id
  }
}