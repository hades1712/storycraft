import { ImagePrompt, VideoPrompt } from '@/app/types'
import yaml from 'js-yaml'

/**
 * Converts a structured ImagePrompt object to a formatted YAML string
 * for use with image generation services
 */
export function imagePromptToString(imagePrompt: ImagePrompt): string {
  // Define the order explicitly
  const orderedPrompt = {
    Style: imagePrompt.Style,
    Scene: imagePrompt.Scene,
    Composition: {
      shot_type: imagePrompt.Composition.shot_type,
      lighting: imagePrompt.Composition.lighting,
      overall_mood: imagePrompt.Composition.overall_mood
    },
    Subject: imagePrompt.Subject.map(subject => ({
      name: subject.name, 
      description: subject.description
    })),
    Context: imagePrompt.Context.map(context => ({
      name: context.name, 
      description: context.description
    })),
  };
  return yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 });
}

/**
 * Converts a structured VideoPrompt object to a formatted YAML string
 * for use with video generation services
 */
export function videoPromptToString(videoPrompt: VideoPrompt): string {
  // Define the order explicitly
  const orderedPrompt = {
    Action: videoPrompt.Action,
    Camera_Motion: videoPrompt.Camera_Motion,
    Ambiance_Audio: videoPrompt.Ambiance_Audio,
    Dialogue: videoPrompt.Dialogue
  };
  return yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 });
}
