'use server'

import { tts } from '@/lib/tts';
import { Language } from '../types';
import logger from '../logger';

export async function generateVoiceover(
    scenes: Array<{
        voiceover: string;
      }>,  
      language: Language,
      voiceName?: string
): Promise<string[]> {
  logger.debug('Generating voiceover with voice:', voiceName || 'default');
  try {
    const speachAudioFiles = await Promise.all(scenes.map(async (scene) => {
        const filename = await tts(scene.voiceover, language.code, voiceName);
        return { filename, text: scene.voiceover };
    }));
    const voiceoverAudioUrls = speachAudioFiles.map(r => r.filename);
    return voiceoverAudioUrls;
  } catch (error) {
    logger.error('Error generating voiceover:', error)
    throw new Error(`Failed to generate voiceover: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
