import { ContentListUnion, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid'
import { uploadImage } from '@/lib/storage'

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
        maxOutputTokens: -1,
    }): Promise<string | undefined> {

    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
        model,
        config,
        contents: prompt,
    });

    return response.text;
}

export async function generateImage(
    prompt: ContentListUnion,
    config: GenerateContentConfig = {
        responseModalities: ["TEXT", "IMAGE"],
        candidateCount: 1
    }): Promise<string | undefined> {

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
        console.log("No candidates found in the response.");
        return;
    }

    const firstCandidate = response.candidates[0];
    let imageGcsUri;
    for (const part of firstCandidate.content!.parts!) {
        if (part.inlineData) {
            const imageBuffer = Buffer.from(part.inlineData!.data!, "base64");
            const mimeType = part.inlineData!.mimeType!;
            const extension = mimeType.split("/")[1] || "png";
            const uuid = uuidv4()
            imageGcsUri = await uploadImage(imageBuffer.toString('base64'), `gemini-${uuid}.png`)
            return imageGcsUri!;
        }
    };
}
