'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GcsImage } from "../ui/gcs-image"
import { Loader2 } from 'lucide-react'
import { Scene, Scenario } from '../../types'
import { conversationalEdit } from '@/app/actions/conversational-edit'

interface ConversationalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  sceneNumber: number;
  scenario: Scenario;
  onUpdate: (updatedScene: Scene) => void;
}

export function ConversationalEditModal({
  isOpen,
  onClose,
  scene,
  sceneNumber,
  scenario,
  onUpdate,
}: ConversationalEditModalProps) {
  const [instruction, setInstruction] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleEditImage = async () => {
    if (!instruction.trim() || !scene.imageGcsUri) return

    setIsEditing(true)
    try {
      const result = await conversationalEdit({
        imageGcsUri: scene.imageGcsUri,
        instruction: instruction.trim(),
        sceneNumber,
        scenarioId: scenario.name // Using scenario name as ID
      })

      if (result.success && result.imageGcsUri) {
        // Update the scene with the new image
        const updatedScene = {
          ...scene,
          imageGcsUri: result.imageGcsUri,
          errorMessage: undefined
        }
        onUpdate(updatedScene)
        onClose()
        setInstruction('')
      } else {
        // Update scene with error message
        const updatedScene = {
          ...scene,
          errorMessage: result.errorMessage || 'Failed to edit image'
        }
        onUpdate(updatedScene)
      }
    } catch (error) {
      console.error('Error editing image:', error)
      const updatedScene = {
        ...scene,
        errorMessage: 'An error occurred while editing the image'
      }
      onUpdate(updatedScene)
    } finally {
      setIsEditing(false)
    }
  }

  const handleClose = () => {
    if (!isEditing) {
      onClose()
      setInstruction('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conversational Edit - Scene {sceneNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image Display */}
          <div className="relative w-full aspect-[11/6] overflow-hidden rounded-lg border">
            {scene.imageGcsUri ? (
              <GcsImage
                gcsUri={scene.imageGcsUri}
                alt={`Scene ${sceneNumber}`}
                className="w-full h-full object-contain object-center"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                No image available
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Instruction Input */}
          <div className="space-y-2">
            <label htmlFor="instruction" className="text-sm font-medium">
              Describe how you want to edit this image:
            </label>
            <Textarea
              id="instruction"
              placeholder="e.g., Add a sunset in the background, make the character smile, change the lighting to be more dramatic..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-[100px]"
              disabled={isEditing}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditImage}
              disabled={!instruction.trim() || !scene.imageGcsUri || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                'Edit Image'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
