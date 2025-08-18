'use server'

import { exportMovie as exportMovieFFMPEG } from '@/lib/ffmpeg';
import { TimelineLayer } from '../types';


export async function exportMovieAction(
  layers: Array<TimelineLayer>
): Promise<{ success: true, videoUrl: string, vttUrl?: string } | { success: false, error: string }> {
  try {
    console.log('Exporting movie...');
    const { videoUrl, vttUrl } = await exportMovieFFMPEG(
      layers
    );
    console.log('videoUrl:', videoUrl);
    if (vttUrl) console.log('vttUrl:', vttUrl);
    console.log(`Generated video!`);
    return { success: true, videoUrl, vttUrl }
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' }
  }
}