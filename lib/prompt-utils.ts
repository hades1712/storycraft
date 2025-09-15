import { ImagePrompt, VideoPrompt, Scenario } from '@/app/types'
import yaml from 'js-yaml'
import logger from '@/app/logger';

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
export function videoPromptToString(videoPrompt: VideoPrompt, scenario: Scenario): string {
  logger.debug(JSON.stringify(videoPrompt, null, 2))
  const dialogue = videoPrompt.Dialogue.map(dialogue => {
    const character = scenario.characters.find(character => dialogue.name === character.name);
    const voicePrompt = character ? character.voice : ""
    return {Speaker: dialogue.speaker, Voice: voicePrompt, Line: dialogue.line} 
  })

  logger.debug(dialogue)

  // Define the order explicitly
  const orderedPrompt = {
    Action: videoPrompt.Action,
    Camera_Motion: videoPrompt.Camera_Motion,
    Ambiance_Audio: videoPrompt.Ambiance_Audio + " No music. No music! No music whatsoever.",
    Dialogue: dialogue,
  };
  logger.debug(orderedPrompt)
  logger.debug(JSON.stringify(orderedPrompt, null, 2))
  return yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 });
}
