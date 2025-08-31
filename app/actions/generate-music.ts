'use server'

import { generateMusicRest } from '@/lib/lyria';
import logger from '../logger';

export async function generateMusic(prompt: string): Promise<string> {
  logger.debug('Generating music')
  try {
    const musicUrl = await generateMusicRest(prompt)
    logger.debug('Music generated!')
    return musicUrl; 
  } catch (error) {
    logger.error('Error generating music:', error)
    throw new Error(`Failed to music: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
