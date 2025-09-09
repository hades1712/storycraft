'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Grid, List, Loader2, Presentation, Video, ChevronLeft, ChevronRight, Plus, Minus, Image, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Scene, Scenario, ImagePrompt, VideoPrompt } from "../../types"
import { SceneData } from './scene-data'
import { GcsImage } from '../ui/gcs-image'
import { VideoPlayer } from '../video/video-player'

const VEO_MODEL_OPTIONS = [
  { 
    label: "Videos with Veo 3.0 Fast 🔈", 
    modelName: "veo-3.0-fast-generate-001",
    generateAudio: true
  },
  { 
    label: "Videos with Veo 3.0 Fast", 
    modelName: "veo-3.0-fast-generate-001",
    generateAudio: false
  },
  { 
    label: "Videos with Veo 3.0 🔈", 
    modelName: "veo-3.0-generate-001",
    generateAudio: true
  },
  { 
    label: "Videos with Veo 3.0", 
    modelName: "veo-3.0-generate-001",
    generateAudio: false
  }
];

function ImagePromptDisplay({ imagePrompt }: { imagePrompt: ImagePrompt }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="font-medium text-xs">Style:</span>
        <p className="text-sm text-card-foreground/80">{imagePrompt.Style}</p>
      </div>
      <div>
        <span className="font-medium text-xs">Scene:</span>
        <p className="text-sm text-card-foreground/80">{imagePrompt.Scene}</p>
      </div>
      <div>
        <span className="font-medium text-xs">Composition:</span>
        <p className="text-sm text-card-foreground/80">
          {imagePrompt.Composition.shot_type}, {imagePrompt.Composition.lighting}, {imagePrompt.Composition.overall_mood}
        </p>
      </div>
      <div>
        <span className="font-medium text-xs">Subjects:</span>
        {imagePrompt.Subject.map((subject, index) => (
          <p key={index} className="text-sm text-card-foreground/80 ml-2">
            • {subject.name}
          </p>
        ))}
      </div>
      <div>
        <span className="font-medium text-xs">Props:</span>
        {imagePrompt.Prop?.map((prop, index) => (
          <p key={index} className="text-sm text-card-foreground/80 ml-2">
            • {prop.name}
          </p>
        ))}
      </div>
      <div>
        <span className="font-medium text-xs">Context:</span>
        {imagePrompt.Context.map((context, index) => (
          <p key={index} className="text-sm text-card-foreground/80 ml-2">
            • {context.name}
          </p>
        ))}
      </div>
    </div>
  )
}

function VideoPromptDisplay({ videoPrompt }: { videoPrompt: VideoPrompt }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="font-medium text-xs">Action:</span>
        <p className="text-sm text-card-foreground/80">{videoPrompt.Action}</p>
      </div>
      <div>
        <span className="font-medium text-xs">Camera Motion:</span>
        <p className="text-sm text-card-foreground/80">{videoPrompt.Camera_Motion}</p>
      </div>
      <div>
        <span className="font-medium text-xs">Ambiance Audio:</span>
        <p className="text-sm text-card-foreground/80">{videoPrompt.Ambiance_Audio}</p>
      </div>
      {videoPrompt.Dialogue.length > 0 && (
        <div>
          <span className="font-medium text-xs">Dialogue:</span>
          {videoPrompt.Dialogue.map((dialogue, index) => (
            <p key={index} className="text-sm text-card-foreground/80 ml-2">
              • {dialogue.speaker}: "{dialogue.line}"
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

type ViewMode = 'grid' | 'list' | 'slideshow'
type DisplayMode = 'image' | 'video'

interface StoryboardTabProps {
  scenario: Scenario
  isVideoLoading: boolean
  generatingScenes: Set<number>
  errorMessage: string | null
  onGenerateAllVideos: (model: string, generateAudio: boolean) => Promise<void>
  onUpdateScene: (index: number, updatedScene: Scene) => void
  onRegenerateImage: (index: number) => Promise<void>
  onGenerateVideo: (index: number) => Promise<void>
  onUploadImage: (index: number, file: File) => Promise<void>
  onAddScene: () => void
  onRemoveScene: (index: number) => void
  onReorderScenes: (fromIndex: number, toIndex: number) => void
}

export function StoryboardTab({
  scenario,
  isVideoLoading,
  generatingScenes,
  errorMessage,
  onGenerateAllVideos,
  onUpdateScene,
  onRegenerateImage,
  onGenerateVideo,
  onUploadImage,
  onAddScene,
  onRemoveScene,
  onReorderScenes,
}: StoryboardTabProps) {
  const scenes = scenario.scenes
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('image')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedModel, setSelectedModel] = useState(VEO_MODEL_OPTIONS[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleGenerateAllVideosClick = () => {
    onGenerateAllVideos(selectedModel.modelName, selectedModel.generateAudio)
  }
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [activeTabs, setActiveTabs] = useState<{ [key: number]: string }>({})

  // Handle current slide index when scenes change
  useEffect(() => {
    if (currentSlide >= scenes.length && scenes.length > 0) {
      setCurrentSlide(scenes.length - 1)
    }
  }, [scenes.length, currentSlide])

  // Initialize active tabs for new scenes
  useEffect(() => {
    const newActiveTabs = { ...activeTabs }
    scenes.forEach((_, index) => {
      if (!newActiveTabs[index]) {
        newActiveTabs[index] = 'general'
      }
    })
    setActiveTabs(newActiveTabs)
  }, [scenes.length])

  console.log(JSON.stringify(scenario, null, 2))

  const setActiveTab = (sceneIndex: number, tab: string) => {
    setActiveTabs(prev => ({
      ...prev,
      [sceneIndex]: tab
    }))
  }

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', index.toString())
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderScenes(draggedIndex, index)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const renderScenes = () => {
    switch (viewMode) {
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, index) => (
              <SceneData
                key={index}
                sceneNumber={index + 1}
                scene={scene}
                scenario={scenario}
                onUpdate={(updatedScene) => onUpdateScene(index, updatedScene)}
                onRegenerateImage={() => onRegenerateImage(index)}
                onGenerateVideo={() => onGenerateVideo(index)}
                onUploadImage={(file) => onUploadImage(index, file)}
                onRemoveScene={() => onRemoveScene(index)}
                isGenerating={generatingScenes.has(index)}
                canDelete={scenes.length > 1}
                displayMode={displayMode}
                isDragOver={dragOverIndex === index}
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
              />
            ))}
            {/* Add Scene Card */}
            <Card className="overflow-hidden border-dashed border-2 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => onAddScene()}>
              <div className="flex flex-col h-full">
                <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <Plus className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Add Scene</p>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Click to add a new scene</p>
                </CardContent>
              </div>
            </Card>
          </div>
        )
      case 'list':
        return (
          <div className="space-y-6">
            {scenes.map((scene, index) => (
              <div key={index} className="flex gap-6">
                <div className="w-1/3">
                  <SceneData
                    sceneNumber={index + 1}
                    scene={scene}
                    scenario={scenario}
                    onUpdate={(updatedScene) => onUpdateScene(index, updatedScene)}
                    onRegenerateImage={() => onRegenerateImage(index)}
                    onGenerateVideo={() => onGenerateVideo(index)}
                    onUploadImage={(file) => onUploadImage(index, file)}
                    onRemoveScene={() => onRemoveScene(index)}
                    isGenerating={generatingScenes.has(index)}
                    canDelete={scenes.length > 1}
                    displayMode={displayMode}
                    hideControls
                    isDragOver={dragOverIndex === index}
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver(index)}
                    onDrop={handleDrop(index)}
                  />
                </div>
                <div className="w-2/3">
                  <div className="p-4 bg-card rounded-lg border h-full">
                    <h3 className="font-semibold mb-4 text-card-foreground">Scene {index + 1}</h3>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-border mb-4">
                      <div
                        role="tab"
                        tabIndex={0}
                        onClick={() => setActiveTab(index, 'general')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setActiveTab(index, 'general')
                          }
                        }}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${activeTabs[index] === 'general'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          }`}
                      >
                        General
                      </div>
                      <div
                        role="tab"
                        tabIndex={0}
                        onClick={() => setActiveTab(index, 'image')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setActiveTab(index, 'image')
                          }
                        }}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${activeTabs[index] === 'image'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          }`}
                      >
                        Image Prompt
                      </div>
                      <div
                        role="tab"
                        tabIndex={0}
                        onClick={() => setActiveTab(index, 'video')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setActiveTab(index, 'video')
                          }
                        }}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${activeTabs[index] === 'video'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          }`}
                      >
                        Video Prompt
                      </div>
                    </div>

                    {/* Tab Content */}
                    {activeTabs[index] === 'general' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-card-foreground mb-1">Description</h4>
                          <p className="text-sm text-card-foreground/80 whitespace-pre-wrap">{scene.description}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-card-foreground mb-1">Voiceover</h4>
                          <p className="text-sm text-card-foreground/80 whitespace-pre-wrap">{scene.voiceover}</p>
                        </div>
                      </div>
                    )}

                    {activeTabs[index] === 'image' && (
                      <div className="space-y-4">
                        <ImagePromptDisplay imagePrompt={scene.imagePrompt} />
                      </div>
                    )}

                    {activeTabs[index] === 'video' && (
                      <div className="space-y-4">
                        <VideoPromptDisplay videoPrompt={scene.videoPrompt} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Add Scene Card */}
            <div className="flex gap-6">
              <div className="w-1/3">
                <Card className="overflow-hidden border-dashed border-2 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => onAddScene()}>
                  <div className="flex flex-col h-full">
                    <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center bg-muted/30">
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Add Scene</p>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground text-center">New Scene</p>
                    </CardContent>
                  </div>
                </Card>
              </div>
              <div className="w-2/3">
                <div className="p-4 bg-muted/30 rounded-lg border-dashed border-2 h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Click to add a new scene</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'slideshow':
        if (scenes.length === 0) return null
        const goToPrevious = () => {
          setCurrentSlide((prev) => (prev > 0 ? prev - 1 : scenes.length - 1))
        }
        const goToNext = () => {
          setCurrentSlide((prev) => (prev < scenes.length - 1 ? prev + 1 : 0))
        }
        return (
          <div className="relative max-w-4xl mx-auto">
            <div className="aspect-video relative bg-black rounded-lg overflow-hidden max-h-[60vh] group">
              {displayMode === 'video' && scenes[currentSlide].videoUri ? (
                <div className="absolute inset-0">
                  <VideoPlayer videoGcsUri={scenes[currentSlide].videoUri} aspectRatio={scenario.aspectRatio} />
                </div>
              ) : (
                <GcsImage
                  gcsUri={scenes[currentSlide].imageGcsUri || null}
                  alt={`Scene ${currentSlide + 1}`}
                  className="w-full h-full object-contain"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Previous scene</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Next scene</span>
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 bg-black/50 rounded-full backdrop-blur-sm z-10">
                {scenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      currentSlide === index ? "bg-white" : "bg-white/50 hover:bg-white/75"
                    )}
                    aria-label={`Go to scene ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-card rounded-lg border">
                <h3 className="font-semibold mb-2 text-card-foreground">Scene {currentSlide + 1}</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-card-foreground mb-1">Image Prompt</h4>
                    <ImagePromptDisplay imagePrompt={scenes[currentSlide].imagePrompt} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-card-foreground mb-1">Voiceover</h4>
                    <p className="text-sm text-card-foreground/80">{scenes[currentSlide].voiceover}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => onAddScene()}
                  className="border-dashed border-2 hover:bg-accent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scene
                </Button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground",
                viewMode === 'grid' && "bg-accent text-accent-foreground"
              )}
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground",
                viewMode === 'list' && "bg-accent text-accent-foreground"
              )}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('slideshow')}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground",
                viewMode === 'slideshow' && "bg-accent text-accent-foreground"
              )}
            >
              <Presentation className="h-4 w-4" />
              <span className="sr-only">Slideshow view</span>
            </Button>
          </div>

          {/* Display Mode Slider */}
          <div className="flex items-center gap-2 ml-4">
            <Image className="h-4 w-4 text-muted-foreground" />
            <div className="relative w-8 h-6 bg-muted rounded-full cursor-pointer" onClick={() => setDisplayMode(displayMode === 'image' ? 'video' : 'image')}>
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-primary rounded-full transition-transform duration-200",
                displayMode === 'video' ? "translate-x-3" : "translate-x-1"
              )} />
            </div>
            <Video className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex">
          <Button
            onClick={handleGenerateAllVideosClick}
            disabled={isVideoLoading || scenes.length === 0 || generatingScenes.size > 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-none"
          >
            {isVideoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Videos...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                {selectedModel.label}
              </>
            )}
          </Button>
          <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-2 border-l-0 rounded-l-none bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isVideoLoading || scenes.length === 0 || generatingScenes.size > 0}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="py-1">
                {VEO_MODEL_OPTIONS.map((option, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setSelectedModel(option)
                      setIsDropdownOpen(false)
                    }}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {renderScenes()}

      {errorMessage && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
          {errorMessage}
        </div>
      )}
    </div>
  )
} 