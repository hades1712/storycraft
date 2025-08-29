export interface ImagePrompt {
  Style: string;
  Scene: string;
  Composition: {
    shot_type: string;
    lighting: string;
    overall_mood: string;
  };
  Subject: Array<{ name: string, description: string }>;
  Context: Array<{ name: string, description: string }>;
}

export interface VideoPrompt {
  Action: string;
  Camera_Motion: string;
  Ambiance_Audio: string;
  Dialogue: Array<{
    speaker: string;
    line: string;
  }>;
}

export interface Scene {
  imagePrompt: ImagePrompt;
  videoPrompt: VideoPrompt;
  description: string;
  voiceover: string;
  charactersPresent: string[];
  imageGcsUri?: string;
  videoUri?: string;
  voiceoverAudioUri?: string;
  errorMessage?: string;
}

export interface Scenario {
  name: string;
  pitch: string;
  scenario: string;
  style: string;
  genre: string;
  mood: string;
  music: string;
  musicUrl?: string;
  language: Language;
  characters: Array<{ name: string, description: string, imageGcsUri?: string }>;
  settings: Array<{ name: string, description: string, imageGcsUri?: string }>;
  logoOverlay?: string;
  scenes: Scene[];
}

export interface Language {
  name: string;
  code: string;
} 

export interface TimelineLayer {
  id: string
  name: string
  type: 'video' | 'voiceover' | 'music'
  items: TimelineItem[]
}

export interface TimelineItem {
  id: string
  startTime: number
  duration: number
  content: string // URL for video/music/voiceover
  type: 'video' | 'voiceover' | 'music'
  metadata?: {
    logoOverlay?: string
    [key: string]: any // Allow for additional metadata fields
  }
}