'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useScenario } from '@/hooks/use-scenario'
import { useAuth } from '@/hooks/use-auth'
import { BookOpen, Calendar, Clock, Play, Plus, Trash2 } from 'lucide-react'
import { Scenario } from '@/app/types'
import { GcsImage } from '../ui/gcs-image'

interface StoriesTabProps {
  onSelectScenario: (scenario: Scenario, scenarioId?: string) => void
  onCreateNewStory: () => void
}

export function StoriesTab({ onSelectScenario, onCreateNewStory }: StoriesTabProps) {
  const [scenarios, setScenarios] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { loadUserScenarios, setCurrentScenarioId } = useScenario()
  const { session } = useAuth()

  useEffect(() => {
    if (session?.user?.id) {
      loadScenarios()
    }
  }, [session?.user?.id])

  const loadScenarios = async () => {
    try {
      setLoading(true)
      setError(null)
      const userScenarios = await loadUserScenarios()
      setScenarios(userScenarios)
    } catch (err) {
      setError('Failed to load your stories')
      console.error('Error loading scenarios:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectScenario = (scenario: any) => {
    // Set the current scenario ID for future saves
    setCurrentScenarioId(scenario.id)
    
    // Convert Firestore data back to app format
    const appScenario: Scenario = {
      name: scenario.name,
      pitch: scenario.pitch,
      scenario: scenario.scenario,
      style: scenario.style,
      aspectRatio: scenario.aspectRatio || "16:9",
      durationSeconds: scenario.durationSeconds || 8,
      genre: scenario.genre,
      mood: scenario.mood,
      music: scenario.music,
      language: scenario.language,
      characters: scenario.characters,
      props: scenario.props,
      settings: scenario.settings,
      scenes: scenario.scenes,
      musicUrl: scenario.musicUrl,
      logoOverlay: scenario.logoOverlay
    }
    
    // Pass both the scenario and its ID
    onSelectScenario(appScenario, scenario.id)
  }

  const deleteScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/scenarios?id=${scenarioId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete scenario')
      }
      
      // Refresh the list
      await loadScenarios()
    } catch (err) {
      console.error('Error deleting scenario:', err)
      setError('Failed to delete story')
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    
    let date: Date
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (timestamp._seconds) {
      // Firestore Timestamp object
      date = new Date(timestamp._seconds * 1000)
    } else {
      // Regular Date or string
      date = new Date(timestamp)
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sign in to view your stories</h3>
        <p className="text-muted-foreground">
          Create an account to save and manage your story scenarios.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your stories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <BookOpen className="h-12 w-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
        <Button onClick={loadScenarios} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first story to get started!
        </p>
        <Button onClick={onCreateNewStory}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Story
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Stories</h2>
          <p className="text-muted-foreground">
            Select a story to continue working on it or create a new one
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateNewStory} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create New Story
          </Button>
          <Button onClick={loadScenarios} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Create New Story Card */}
        <Card 
          className="hover:shadow-lg transition-shadow border-dashed border-2 border-primary/30 hover:border-primary/50 cursor-pointer"
          onClick={onCreateNewStory}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center h-24">
              <div className="text-center">
                <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg text-primary">Create New Story</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Start fresh with a new story idea
              </p>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>

        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              {/* Scene Image */}
              {scenario.scenes?.[0]?.imageGcsUri && (
                <div className="relative h-32 w-full mb-3 rounded-md overflow-hidden">
                  <GcsImage 
                    gcsUri={scenario.scenes[0].imageGcsUri}
                    alt={`${scenario.name || 'Story'} preview`}
                    className="object-cover"
                    fill={true}
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {scenario.name || 'Untitled Story'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {scenario.style && (
                      <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-full text-xs mr-2">
                        {scenario.style}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Are you sure you want to delete this story?')) {
                      deleteScenario(scenario.id)
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{scenario.scenes?.length || 0} scenes</span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Updated {formatDate(scenario.updatedAt)}</span>
                </div>

                <Button 
                  onClick={() => handleSelectScenario(scenario)}
                  className="w-full"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue Story
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}