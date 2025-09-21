'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Pencil, RefreshCw, Upload, Video, Trash2, GripVertical, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Scene, Scenario } from '../../types'
import { EditSceneModal } from './edit-scene-modal'
import { ConversationalEditModal } from './conversational-edit-modal'
import { VideoPlayer } from "../video/video-player"
import { GcsImage } from "../ui/gcs-image"
import { cn } from "@/lib/utils"

interface SceneDataProps {
  scene: Scene;
  sceneNumber: number;
  scenario: Scenario;
  onUpdate: (updatedScene: SceneDataProps['scene']) => void;
  onRegenerateImage: () => void;
  onGenerateVideo: () => void;
  onUploadImage: (file: File) => void;
  onRemoveScene: () => void;
  isGenerating: boolean;
  canDelete: boolean;
  displayMode?: 'image' | 'video';
  hideControls?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function SceneData({
  scene,
  sceneNumber,
  scenario,
  onUpdate,
  onRegenerateImage,
  onGenerateVideo,
  onUploadImage,
  onRemoveScene,
  isGenerating,
  canDelete,
  displayMode = 'image',
  hideControls = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: SceneDataProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConversationalEditOpen, setIsConversationalEditOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadImage(file)
    }
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200",
        isDragOver && "ring-2 ring-blue-500 bg-blue-50",
        "hover:shadow-lg"
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex flex-col">
        {/* 根据场景期望纵横比动态设置容器比例，避免与子组件 VideoPlayer 的比例不一致导致留黑或裁切 */}
        <div className={cn(
          "relative w-full overflow-hidden group",
          scenario.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        )}>
          {isGenerating && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          {displayMode === 'video' && scene.videoUri ? (
            <div className="absolute inset-0">
              <VideoPlayer videoGcsUri={scene.videoUri} aspectRatio={scenario.aspectRatio} />
            </div>
          ) : (
            <GcsImage
              gcsUri={scene.imageGcsUri || null}
              alt={`Scene ${sceneNumber}`}
              className="absolute inset-0 w-full h-full object-contain object-center rounded-t-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          {!hideControls && (
            <>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-blue-500 hover:text-white"
                  onClick={onGenerateVideo}
                  disabled={isGenerating}
                >
                  <Video className="h-4 w-4" />
                  <span className="sr-only">Generate video for scene</span>
                </Button>
              </div>
              <div className="absolute top-2 left-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-red-500 hover:text-white"
                  onClick={onRegenerateImage}
                  disabled={isGenerating}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Regenerate image</span>
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-green-500 hover:text-white"
                  onClick={handleUploadClick}
                  disabled={isGenerating}
                >
                  <Upload className="h-4 w-4" />
                  <span className="sr-only">Upload image</span>
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-purple-500 hover:text-white"
                  onClick={() => setIsConversationalEditOpen(true)}
                  disabled={isGenerating}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="sr-only">Conversational edit</span>
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
              {canDelete && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-black/50 hover:bg-red-500 hover:text-white"
                    onClick={onRemoveScene}
                    disabled={isGenerating}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete scene</span>
                  </Button>
                </div>
              )}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                  className="bg-black/50 hover:bg-blue-500 hover:text-white p-1.5 rounded cursor-grab active:cursor-grabbing transition-colors select-none"
                  style={{ touchAction: 'none' }}
                  title="Drag to reorder scene"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-3 w-3 text-white" />
                </div>
              </div>
            </>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-primary">Scene {sceneNumber}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-secondary hover:text-primary hover:bg-primary/10"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          {scene.errorMessage && (
              <p className="text-sm text-red-600">{scene.errorMessage}</p>
          )}
          <p className="text-sm text-muted-foreground">{scene.description}</p>
        </CardContent>
      </div>
      <EditSceneModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scene={scene}
        sceneNumber={sceneNumber}
        scenario={scenario}
        onUpdate={onUpdate}
        displayMode={displayMode}
      />
      <ConversationalEditModal
        isOpen={isConversationalEditOpen}
        onClose={() => setIsConversationalEditOpen(false)}
        scene={scene}
        sceneNumber={sceneNumber}
        scenario={scenario}
        onUpdate={onUpdate}
      />
    </Card>
  )
}