'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VideoPlayer } from '../video/video-player'
import { GcsImage } from '../ui/gcs-image'
import { Scene, ImagePrompt, VideoPrompt, Scenario } from '../../types'
import { Plus, Minus } from 'lucide-react'

interface EditSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  sceneNumber: number;
  scenario: Scenario;
  onUpdate: (updatedScene: Scene) => void;
}

export function EditSceneModal({ isOpen, onClose, scene, sceneNumber, scenario, onUpdate }: EditSceneModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [editedScene, setEditedScene] = useState(scene)
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'image' or 'video'

  useEffect(() => {
    setEditedScene(scene)
  }, [scene])

  useEffect(() => {
    if (isOpen) {
      setActiveTab('general') // Reset to general tab when modal opens
    }
  }, [isOpen])

  useEffect(() => {
    const getVideoUrl = async () => {
      if (scene.videoUri) {
        setVideoUrl(scene.videoUri);
      }
    }
    getVideoUrl();
  }, [scene.videoUri]);

  const updateImagePrompt = (field: keyof ImagePrompt, value: any) => {
    setEditedScene(prev => ({
      ...prev,
      imagePrompt: {
        ...prev.imagePrompt,
        [field]: value
      }
    }))
  }

  const updateImagePromptComposition = (field: keyof ImagePrompt['Composition'], value: string) => {
    setEditedScene(prev => ({
      ...prev,
      imagePrompt: {
        ...prev.imagePrompt,
        Composition: {
          ...prev.imagePrompt.Composition,
          [field]: value
        }
      }
    }))
  }

  const updateImagePromptSubjects = (selectedCharacterNames: string[]) => {
    // Convert selected character names to Subject objects with full descriptions
    const subjects = selectedCharacterNames.map(characterName => {
      const character = scenario.characters.find(c => c.name === characterName)
      return {
        name: characterName,
        description: character?.description || ''
      }
    })
    
    setEditedScene(prev => ({
      ...prev,
      imagePrompt: {
        ...prev.imagePrompt,
        Subject: subjects
      }
    }))
  }

  const getSelectedCharacterNames = (): string[] => {
    return editedScene.imagePrompt.Subject.map(subject => subject.name)
  }

  const handleCharacterSelectionChange = (selectedCharacterNames: string[]) => {
    updateImagePromptSubjects(selectedCharacterNames)
  }

  const updateImagePromptContext = (selectedSettingName: string) => {
    // Convert selected setting name to Context object with full description
    const setting = scenario.settings.find(s => s.name === selectedSettingName)
    const context = selectedSettingName ? [{
      name: selectedSettingName,
      description: setting?.description || ''
    }] : []
    
    setEditedScene(prev => ({
      ...prev,
      imagePrompt: {
        ...prev.imagePrompt,
        Context: context
      }
    }))
  }

  const getSelectedSettingName = (): string => {
    return editedScene.imagePrompt.Context.length > 0 ? editedScene.imagePrompt.Context[0].name : ''
  }

  const handleContextSelectionChange = (selectedSettingName: string) => {
    updateImagePromptContext(selectedSettingName)
  }

  const updateVideoPrompt = (field: keyof VideoPrompt, value: any) => {
    setEditedScene(prev => ({
      ...prev,
      videoPrompt: {
        ...prev.videoPrompt,
        [field]: value
      }
    }))
  }

  const updateVideoPromptDialogue = (index: number, field: 'speaker' | 'line', value: string) => {
    setEditedScene(prev => ({
      ...prev,
      videoPrompt: {
        ...prev.videoPrompt,
        Dialogue: prev.videoPrompt.Dialogue.map((dialogue, i) => 
          i === index ? { ...dialogue, [field]: value } : dialogue
        )
      }
    }))
  }

  const addVideoPromptDialogue = () => {
    setEditedScene(prev => ({
      ...prev,
      videoPrompt: {
        ...prev.videoPrompt,
        Dialogue: [...prev.videoPrompt.Dialogue, { speaker: '', line: '' }]
      }
    }))
  }

  const removeVideoPromptDialogue = (index: number) => {
    setEditedScene(prev => ({
      ...prev,
      videoPrompt: {
        ...prev.videoPrompt,
        Dialogue: prev.videoPrompt.Dialogue.filter((_, i) => i !== index)
      }
    }))
  }

  const handleSave = () => {
    onUpdate(editedScene)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scene {sceneNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          {/* Left side - Image/Video */}
          <div className="space-y-4">
            <div className="relative w-full h-[300px] overflow-hidden rounded-lg bg-muted">
              {videoUrl ? (
                <div className="absolute inset-0">
                  <VideoPlayer src={videoUrl} />
                </div>
              ) : (
                <GcsImage
                  gcsUri={editedScene.imageGcsUri || null}
                  alt={`Scene ${sceneNumber}`}
                  className="w-full h-full object-cover object-center"
                />
              )}
            </div>
          </div>

          {/* Right side - Tabbed Scene Parameters */}
          <div className="lg:col-span-2">
            {/* Custom Tab Navigation */}
            <div className="flex border-b border-border mb-6">
              <div
                role="tab"
                tabIndex={0}
                onClick={() => setActiveTab('general')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab('general')
                  }
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${
                  activeTab === 'general'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                General
              </div>
              <div
                role="tab"
                tabIndex={0}
                onClick={() => setActiveTab('image')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab('image')
                  }
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${
                  activeTab === 'image'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Image Prompt
              </div>
              <div
                role="tab"
                tabIndex={0}
                onClick={() => setActiveTab('video')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab('video')
                  }
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer select-none ${
                  activeTab === 'video'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Video Prompt
              </div>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* General Section */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={editedScene.description}
                      onChange={(e) => setEditedScene({ ...editedScene, description: e.target.value })}
                      placeholder="What happens in this scene?"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="voiceover" className="text-sm font-medium">
                      Voiceover
                    </label>
                    <Input
                      id="voiceover"
                      value={editedScene.voiceover}
                      onChange={(e) => setEditedScene({ ...editedScene, voiceover: e.target.value })}
                      placeholder="What should the narrator say?"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'image' && (
              <div className="space-y-6">
                {/* Image Prompt Section */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Style</label>
                    <Input
                      value={editedScene.imagePrompt.Style}
                      onChange={(e) => updateImagePrompt('Style', e.target.value)}
                      placeholder="Define the visual language..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Scene</label>
                    <Textarea
                      value={editedScene.imagePrompt.Scene}
                      onChange={(e) => updateImagePrompt('Scene', e.target.value)}
                      placeholder="Describe what's happening in this moment..."
                      rows={2}
                    />
                  </div>

                  {/* Composition Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Composition</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Shot Type</label>
                        <Input
                          value={editedScene.imagePrompt.Composition.shot_type}
                          onChange={(e) => updateImagePromptComposition('shot_type', e.target.value)}
                          placeholder="e.g., Close-up, Wide shot"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Lighting</label>
                        <Input
                          value={editedScene.imagePrompt.Composition.lighting}
                          onChange={(e) => updateImagePromptComposition('lighting', e.target.value)}
                          placeholder="e.g., High-contrast"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Overall Mood</label>
                        <Input
                          value={editedScene.imagePrompt.Composition.overall_mood}
                          onChange={(e) => updateImagePromptComposition('overall_mood', e.target.value)}
                          placeholder="e.g., Atmospheric"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subject Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Characters in Scene</label>
                    <MultiSelect
                      options={scenario.characters.map(character => ({
                        label: character.name,
                        value: character.name
                      }))}
                      selected={getSelectedCharacterNames()}
                      onChange={handleCharacterSelectionChange}
                      placeholder="Select characters for this scene..."
                      className="ml-4"
                    />
                  </div>

                  {/* Context Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Setting in Scene</label>
                    <Select value={getSelectedSettingName()} onValueChange={handleContextSelectionChange}>
                      <SelectTrigger className="ml-4">
                        <SelectValue placeholder="Select setting for this scene..." />
                      </SelectTrigger>
                      <SelectContent>
                        {scenario.settings.map(setting => (
                          <SelectItem key={setting.name} value={setting.name}>
                            {setting.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-6">
                {/* Video Prompt Section */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Action</label>
                    <Textarea
                      value={editedScene.videoPrompt.Action}
                      onChange={(e) => updateVideoPrompt('Action', e.target.value)}
                      placeholder="Describe what the subject(s) are doing..."
                      rows={2}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Camera Motion</label>
                    <Input
                      value={editedScene.videoPrompt.Camera_Motion}
                      onChange={(e) => updateVideoPrompt('Camera_Motion', e.target.value)}
                      placeholder="e.g., Static, Pan left, Zoom in"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Ambiance Audio</label>
                    <Input
                      value={editedScene.videoPrompt.Ambiance_Audio}
                      onChange={(e) => updateVideoPrompt('Ambiance_Audio', e.target.value)}
                      placeholder="Describe diegetic sounds in the scene..."
                    />
                  </div>

                  {/* Dialogue Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Dialogue</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVideoPromptDialogue}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Dialogue
                      </Button>
                    </div>
                    {editedScene.videoPrompt.Dialogue.map((dialogue, index) => (
                      <div key={index} className="flex gap-2 ml-4">
                        <div className="flex-1">
                          <Input
                            value={dialogue.speaker}
                            onChange={(e) => updateVideoPromptDialogue(index, 'speaker', e.target.value)}
                            placeholder="Speaker description"
                          />
                        </div>
                        <div className="flex-2">
                          <Input
                            value={dialogue.line}
                            onChange={(e) => updateVideoPromptDialogue(index, 'line', e.target.value)}
                            placeholder="Dialogue line"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVideoPromptDialogue(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

