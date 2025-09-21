import { ContentListUnion, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid'
import { uploadImage } from '@/lib/storage'
import logger from '@/app/logger';

const LOCATION = process.env.LOCATION
const PROJECT_ID = process.env.PROJECT_ID

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });


export async function generateContent(
    prompt: ContentListUnion,
    config: GenerateContentConfig = {
        thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
    },
    model: string = 'gemini-2.5-flash'
): Promise<string | undefined> {

    const useSearchAndBrowser = false;
    if (useSearchAndBrowser) {
        config.tools = [
            { googleSearch: {}, },
            { urlContext: {}, }
        ]
        config.responseMimeType = 'text/plain'
    }
    
    const response = await ai.models.generateContent({
        model,
        config,
        contents: prompt,
    });

    return response.text;
}

interface GenerateNanoBananaImageResponse {
    success: boolean;
    imageGcsUri?: string;
    errorMessage?: string;
}

export async function generateImage(
    prompt: ContentListUnion,
    config: GenerateContentConfig = {
        responseModalities: ["TEXT", "IMAGE"],
        candidateCount: 1
    }): Promise<GenerateNanoBananaImageResponse> {

    const maxRetries = 5; // Maximum number of retries
    const initialDelay = 1000; // Initial delay in milliseconds (1 second)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const ai = new GoogleGenAI({
                vertexai: true,
                project: process.env.PROJECT_ID,
                location: 'global'
            });

            const model = 'gemini-2.5-flash-image-preview';
            const response = await ai.models.generateContent({
                model,
                config,
                contents: prompt,
            });

            // Process the response to find and save the generated image
            if (!response.candidates || response.candidates.length === 0) {
                logger.warn("No candidates found in the response.");
                // If no candidates, but no error, it might be a valid (empty) response, so break retry loop.
                return { success: false, errorMessage: "No candidates found in the response." };
            }

            const firstCandidate = response.candidates[0];
            let imageGcsUri;
            for (const part of firstCandidate.content!.parts!) {
                if (part.inlineData) {
                    const imageBuffer = Buffer.from(part.inlineData!.data!, "base64");
                    const mimeType = part.inlineData!.mimeType!;
                    const extension = mimeType.split("/")[1] || "png";
                    const uuid = uuidv4()
                    // 使用正确的文件扩展名，但由于 uploadImage 会转换为 JPEG，使用 .jpg
                    imageGcsUri = await uploadImage(imageBuffer.toString('base64'), `gemini-${uuid}.jpg`)
                    return { success: true, imageGcsUri: imageGcsUri! };
                }
            };
            // If we reach here, no inlineData was found but no error occurred, so break retry loop.
            return { success: false, errorMessage: response.text };
        } catch (error) {
            logger.error(error)
            if (attempt < maxRetries) {
                const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
                const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
                const delay = baseDelay + jitter;
                logger.warn(`Attempt ${attempt + 1} failed for generateImage. Retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                logger.error(`Failed generateImage after ${maxRetries} attempts.`, error);
                throw error; // Re-throw the error after maximum retries
            }
        }
    }
    throw new Error("generateImage function should have returned or thrown an error before this line.");
}
