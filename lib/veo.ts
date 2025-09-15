import { GoogleAuth } from 'google-auth-library';
import { GoogleGenAI, Part } from '@google/genai';
import logger from '@/app/logger';
import { getRAIUserMessage } from './rai';

const LOCATION = process.env.LOCATION
const PROJECT_ID = process.env.PROJECT_ID
const MODEL = "veo-3.0-generate-001" //process.env.MODEL
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI


const ai = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });


interface GenerateVideoResponse {
  name: string;
  done: boolean;
  response: {
    '@type': 'type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse';
    videos: Array<{
      gcsUri: string;
      mimeType: string;
    }>;
    raiMediaFilteredReasons?: Array<string>;
  };
  error?: { // Add an optional error field to handle operation errors
    code: number;
    message: string;
    status: string;
  };
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;
  if (accessToken) {
    return accessToken;
  } else {
    throw new Error('Failed to obtain access token.');
  }
}

async function checkOperation(operationName: string, model: string = "veo-3.0-generate-001"): Promise<GenerateVideoResponse> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:fetchPredictOperation`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: operationName,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const jsonResponse = await response.json();
  return jsonResponse as GenerateVideoResponse;
}

export async function waitForOperation(operationName: string, model: string = "veo-3.0-generate-001"): Promise<GenerateVideoResponse> {
  const checkInterval = 2000; // Interval for checking operation status (in milliseconds)

  const pollOperation = async (): Promise<GenerateVideoResponse> => {
    logger.debug(`poll operation ${operationName}`)
    const generateVideoResponse = await checkOperation(operationName, model);

    if (generateVideoResponse.done) {
      // Check if there was an error during the operation
      if (generateVideoResponse.error) {
        logger.error(`Operation failed with error: ${generateVideoResponse.error.message}`)
        throw new Error(getRAIUserMessage(generateVideoResponse.error.message));
      }
      return generateVideoResponse;
    } else {
      await delay(checkInterval);
      return pollOperation(); // Recursive call for the next poll
    }
  };

  return pollOperation();
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSceneVideo(prompt: string, imageGcsUri: string, aspectRatio: string = "16:9", model: string = "veo-3.0-generate-001", generateAudio: boolean = true, durationSeconds: number = 8): Promise<string> {
  const token = await getAccessToken();
  const maxRetries = 5; // Maximum number of retries
  const initialDelay = 1000; // Initial delay in milliseconds (1 second)

  const modifiedPrompt = prompt + '\nSubtitles: off'

  logger.debug(model)
  const makeRequest = async (attempt: number) => {
    try {
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: modifiedPrompt,
                image: {
                  gcsUri: imageGcsUri,
                  mimeType: "png",
                },
              },
            ],
            parameters: {
              storageUri: GCS_VIDEOS_STORAGE_URI,
              sampleCount: 1,
              aspectRatio: aspectRatio,
              generateAudio: generateAudio,
              durationSeconds: durationSeconds,
            },
          }),
        }
      );

      // Check if the response was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonResult = await response.json(); // Parse as JSON
      return jsonResult.name;
    } catch (error) {
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
        const delay = baseDelay + jitter;
        logger.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(attempt + 1); // Recursive call for retry
      } else {
        logger.error(`Failed after ${maxRetries} attempts.`, error);
        throw error; // Re-throw the error after maximum retries
      }
    }
  };

  return makeRequest(0); // Start the initial request
}