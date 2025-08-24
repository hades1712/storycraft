import { ContentListUnion, GenerateContentConfig, GoogleGenAI } from '@google/genai';

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