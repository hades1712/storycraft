import { Language, Scene, Scenario } from '@/app/types';
import { videoPromptToString } from '@/lib/prompt-utils';
import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import logger from '@/app/logger';
import { getRAIUserMessage } from '@/lib/rai';
import { auth } from '@/auth';


const USE_COSMO = process.env.USE_COSMO === "true";

// 从环境变量获取统一的 GCS 存储桶名称
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'storycraft-videos';

// 构建占位符视频 URL
const placeholderVideoUrls = [
  `gs://${GCS_BUCKET_NAME}/videos/cosmo.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/dogs1.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/dogs2.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/cats1.mp4`,
];

const placeholderVideoUrls916 = [
  //`gs://${GCS_BUCKET_NAME}/videos/cat_1_9_16.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/cat_2_9_16.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/dog_9_16.mp4`,
  `gs://${GCS_BUCKET_NAME}/videos/dog_2_9_16.mp4`,
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
  // 🔐 认证检查：确保只有登录用户才能生成视频
  const session = await auth();
  if (!session?.user?.id) {
    logger.warn('Unauthorized video generation attempt');
    return Response.json(
      { success: false, error: '请先登录后再生成视频' },
      { status: 401 }
    );
  }

  logger.info(`User ${session.user.id} is generating videos`);

  const { scenes, scenario, language, aspectRatio, model, generateAudio, durationSeconds }: {
    scenes: Array<Scene>
    scenario: Scenario
    language: Language
    aspectRatio: string
    model?: string
    generateAudio?: boolean
    durationSeconds?: number
  } = await req.json();

  try {
    logger.debug('Generating videos in parallel...');
    logger.debug(`scenes: ${scenes}`);
    logger.debug(`durationSeconds: ${durationSeconds}`);

    const videoGenerationTasks = scenes
      .filter(scene => scene.imageGcsUri)
      .map(async (scene, index) => {
        logger.debug(`Starting video generation for scene ${index + 1}`);
        let url: string;

        // 根据请求参数决定视频纵横比：仅在请求为 9:16 时使用竖屏，其他情况一律 16:9。
        const requestedAspectRatio: '9:16' | '16:9' = aspectRatio === '9:16' ? '9:16' : '16:9';

        if (USE_COSMO) {
          // 占位符视频按请求纵横比选择
          logger.debug(`requested aspectRatio: ${requestedAspectRatio}`);
          if (requestedAspectRatio === '9:16') {
            url = placeholderVideoUrls916[Math.floor(Math.random() * placeholderVideoUrls916.length)];
          } else {
            url = placeholderVideoUrls[Math.floor(Math.random() * placeholderVideoUrls.length)];
          }
        } else {
          // 实际生成视频，将请求的纵横比直接传入生成函数
          const promptString = typeof scene.videoPrompt === 'string' ? scene.videoPrompt : videoPromptToString(scene.videoPrompt, scenario);
          logger.debug(promptString);
          const operationName = await generateSceneVideo(
            promptString,
            scene.imageGcsUri!,
            requestedAspectRatio,
            model || "veo-3.0-generate-001",
            generateAudio !== false,
            durationSeconds
          );
          logger.debug(`Operation started for scene ${index + 1}`);

          const generateVideoResponse = await waitForOperation(operationName, model || "veo-3.0-generate-001");
          logger.debug(`Video generation completed for scene ${index + 1}`);
          logger.debug(generateVideoResponse);

          if (generateVideoResponse.response.raiMediaFilteredReasons) {
            // Throw an error with the determined user-friendly message
            throw new Error(getRAIUserMessage(generateVideoResponse.response.raiMediaFilteredReasons[0]));
          }

          const gcsUri = generateVideoResponse.response.videos[0].gcsUri;
          url = gcsUri;
        }
        logger.debug(`Video Generated! ${url}`);
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


