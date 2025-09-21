import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { concatenateMusicWithFade } from './ffmpeg';
import logger from '@/app/logger';

// 从环境变量获取统一的 GCS 存储桶名称
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'storycraft-videos';

// 音频文件存储路径
const AUDIO_PATH = 'audio/';
// 在第14行修改
// 为LOCATION设置默认值，与terraform保持一致
const LOCATION = process.env.LOCATION || "us-central1"
const PROJECT_ID = process.env.PROJECT_ID
const MODEL = 'lyria-002'


const storage = new Storage();

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;
  // Check if accessToken is null or undefined
  if (accessToken) {
    return accessToken;
  } else {
    // Handle the case where accessToken is null or undefined
    // This could involve throwing an error, retrying, or providing a default value
    throw new Error('Failed to obtain access token.');
  }
}

export async function generateMusicRest(prompt: string): Promise<string> {
  const token = await getAccessToken();
  const maxRetries = 1; // Maximum number of retries
  const initialDelay = 1000; // Initial delay in milliseconds (1 second)
  logger.debug(MODEL)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt
              },
            ],
            parameters: {
              sampleCount: 1,
            },
          }),
        }
      )
      // Check if the response was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonResult = await response.json(); // Parse as JSON
      const audioContent = jsonResult.predictions[0].bytesBase64Encoded;
      // Decode base64 to buffer
      const audioBuffer = Buffer.from(audioContent, 'base64');
      const outputBuffer = await concatenateMusicWithFade(audioBuffer, 'mp3')


      // Define the directory where you want to save the audio files
      const publicDir = path.join(process.cwd(), 'public');
      const outputDir = path.join(publicDir, 'music');

      // Ensure the directory exists
      fs.mkdirSync(outputDir, { recursive: true });

      // Generate a unique filename, e.g., using a timestamp or a UUID
      const uuid = uuidv4();
      const fileName = `music-${uuid}.mp3`;

      // Return the relative file path (for serving the file)
      let musicUrl: string;
      // Upload music to GCS
      logger.debug(`Upload music result to GCS`);
      const bucketName = GCS_BUCKET_NAME;
      const destinationPath = path.join(AUDIO_PATH, fileName);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(destinationPath);

      await file.save(outputBuffer, {
        metadata: {
          contentType: `audio/mpeg`, // Set the correct content type for MP3
        }
      });

      return file.cloudStorageURI.href;
    } catch (error) {
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
        const delay = baseDelay + jitter;
        logger.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(`Failed after ${maxRetries} attempts.`, error);
        throw error; // Re-throw the error after maximum retries
      }
    }
  }
  throw new Error("Function should have returned or thrown an error before this line.");
}