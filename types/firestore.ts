import { ImagePrompt, VideoPrompt } from '@/app/types'

export interface FirestoreUser {
    email: string
    displayName: string
    createdAt: FirebaseFirestore.Timestamp | Date | any
    photoURL: string
  }

export interface FirestoreScenario {
    id: string
    userId: string
    name: string
    pitch: string
    scenario: string
    style: string
    genre: string
    mood: string
    music: string
    musicUrl?: string
    language: {
      name: string
      code: string
    }
    characters: Array<{ name: string, description: string, imageGcsUri?: string }>
    props: Array<{ name: string, description: string, imageGcsUri?: string }>
    settings: Array<{ name: string, description: string, imageGcsUri?: string }>
    logoOverlay?: string
    scenes: Array<{
      imagePrompt: ImagePrompt
      videoPrompt: VideoPrompt
      description: string
      voiceover: string
      charactersPresent: string[]
      imageGcsUri?: string
      videoUri?: string
      voiceoverAudioUri?: string
      errorMessage?: string
    }>
    createdAt: FirebaseFirestore.Timestamp | Date | any
    updatedAt: FirebaseFirestore.Timestamp | Date | any
  }