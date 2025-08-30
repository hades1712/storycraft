"use server";

import { generateContent } from '@/lib/gemini';
import logger from '../logger';


export async function regenerateScenarioFromSetting(
    currentScenario: string,
    oldSettingName: string,
    newSettingName: string,
    newSettingDescription: string
): Promise<{
    updatedScenario: string;
}> {

    try {
        // Update scenario text to reflect setting changes
        const text = await generateContent(
            `Update the following scenario to reflect setting changes. The setting previously named "${oldSettingName}" is now named "${newSettingName}" with the following updated description: "${newSettingDescription}".

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Replace all references to "${oldSettingName}" with "${newSettingName}" (if the name changed)
2. Update any setting descriptions in the scenario to match the new setting description
3. Ensure the story flow and narrative remain coherent with the new setting
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

        logger.debug('text', text)

        return {
            updatedScenario: text!.trim(),
        };
    } catch (error) {
        logger.error("Error in regenerateScenarioFromSetting:", error);
        throw new Error(
            `Failed to regenerate scenario: ${error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}