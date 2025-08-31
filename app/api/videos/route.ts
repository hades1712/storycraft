import { Scene } from '@/app/types';
import { videoPromptToString } from '@/lib/prompt-utils';
import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { Storage } from '@google-cloud/storage';
import logger from '@/app/logger';


const USE_COSMO = process.env.USE_COSMO === "true";
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI;

const placeholderVideoUrls = [
  `${GCS_VIDEOS_STORAGE_URI}cosmo.mp4`,
  `${GCS_VIDEOS_STORAGE_URI}dogs1.mp4`,
  `${GCS_VIDEOS_STORAGE_URI}dogs2.mp4`,
  `${GCS_VIDEOS_STORAGE_URI}cats1.mp4`,
];

/**
 * Handles POST requests to generate videos from a list of scenes.
 *
 * @param req - The incoming request object, containing a JSON payload with an array of scenes.
 *               Each scene should have `imagePrompt`, `description`, `voiceover`, and optionally `imageBase64`.
 * @returns A Promise that resolves to a Response object. The response will be a JSON object
 *          with either a success flag and the generated video URLs or an error message.
 */
export async function POST(req: Request): Promise<Response> {

  const { scenes }: {
    scenes: Array<Scene>
  } = await req.json();



  try {
    logger.debug('Generating videos in parallel...');
    logger.debug(`scenes: ${scenes}`);
    const storage = new Storage();

    const videoGenerationTasks = scenes
      .filter(scene => scene.imageGcsUri)
      .map(async (scene, index) => {
        logger.debug(`Starting video generation for scene ${index + 1}`);
        let url: string;
        if (USE_COSMO) {
          // randomize the placeholder video urls
          url = placeholderVideoUrls[Math.floor(Math.random() * placeholderVideoUrls.length)];
        } else {
          const promptString = typeof scene.videoPrompt === 'string' ? scene.videoPrompt : videoPromptToString(scene.videoPrompt);
          logger.debug(promptString)
          const operationName = await generateSceneVideo(promptString, scene.imageGcsUri!);
          logger.debug(`Operation started for scene ${index + 1}`);

          const generateVideoResponse = await waitForOperation(operationName);
          logger.debug(`Video generation completed for scene ${index + 1}`);
          logger.debug(generateVideoResponse)

          if (generateVideoResponse.response.raiMediaFilteredReasons) {
            // Throw an error with the determined user-friendly message
            throw new Error(generateVideoResponse.response.raiMediaFilteredReasons);
          }

          const gcsUri = generateVideoResponse.response.videos[0].gcsUri;
          url = gcsUri;
        }
        logger.debug(`Video Generated! ${url}`)
        return url;
      });

    const videoUrls = await Promise.all(videoGenerationTasks);

    return Response.json({ success: true, videoUrls }); // Return response data if needed
  } catch (error) {
    logger.error('Error in generateVideo:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate video(s)' }
    );
  }
}


