"use server";

import { generateContent } from '@/lib/gemini';
import { generateImageRest } from "@/lib/imagen";
import yaml from 'js-yaml';

export async function regenerateCharacterAndScenarioFromText(
    currentScenario: string,
    oldCharacterName: string,
    newCharacterName: string,
    newCharacterDescription: string,
    style: string
): Promise<{
    newScenario: string;
    newImageGcsUri: string;
}> {

    try {
        const orderedPrompt = {
            style: style,
            //name: newCharacterName,
            shot_type: "Medium Shot",
            description: newCharacterDescription,
            // prohibited_elements: "watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
        };

        // Step 1: Generate new character image
        const imageResult = await generateImageRest(
            yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }),
            "1:1"
        );

        if (imageResult.predictions[0].raiFilteredReason) {
            throw new Error(
                `Image generation failed: ${imageResult.predictions[0].raiFilteredReason}`
            );
        }

        const newImageGcsUri = imageResult.predictions[0].gcsUri;

        // Step 2: Update scenario text to reflect character changes
        const text = await generateContent(
            `Update the following scenario to reflect character changes. The character previously named "${oldCharacterName}" is now named "${newCharacterName}" with the following updated description: "${newCharacterDescription}".

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Replace all references to "${oldCharacterName}" with "${newCharacterName}" (if the name changed)
2. Update any character descriptions in the scenario to match the new character description
3. Ensure the story flow and narrative remain coherent
4. Maintain the same tone and style as the original scenario
5. Keep the scenario length similar to the original

Return ONLY the updated scenario text, no additional formatting or explanations.`,
            {
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget: -1,
                },
                responseMimeType: 'text/plain',
            }
        );

        return {
            newScenario: text!.trim(),
            newImageGcsUri,
        };
    } catch (error) {
        console.error("Error in regenerateCharacterAndScenarioFromText:", error);
        throw new Error(
            `Failed to regenerate character and scenario: ${error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}