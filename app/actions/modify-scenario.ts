"use server";

import { generateContent, generateImage } from '@/lib/gemini';
import { generateImageRest } from "@/lib/imagen";
import { z } from "zod";
import yaml from 'js-yaml';
import logger from '../logger';
import { createPartFromText, createPartFromUri } from '@google/genai';

// Shared types
export interface Character {
    name: string;
    description: string;
    imageGcsUri?: string;
}
export interface Setting {
    name: string;
    description: string;
    imageGcsUri?: string;
}

export interface ScenarioUpdateResult {
    updatedScenario: string;
    updatedCharacter?: {
        name: string;
        description: string;
    };
    updatedSetting?: {
        name: string;
        description: string;
    };
    newImageGcsUri?: string;
}

// Zod schema for character and scenario updates
const CharacterScenarioUpdateSchema = z.object({
    updatedScenario: z.string(),
    updatedCharacter: z.object({
        name: z.string(),
        description: z.string(),
    }),
});

const SettingScenarioUpdateSchema = z.object({
    updatedScenario: z.string(),
    updatedSetting: z.object({
        name: z.string(),
        description: z.string(),
    }),
});

// Common error handling
const handleError = (operation: string, error: unknown): never => {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${errorMessage}`);
};

// Common Gemini configuration
const geminiConfig = {
    thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: -1,
    },
    responseMimeType: 'text/plain' as const,
};

// Shared function to update scenario text
async function updateScenarioText(
    currentScenario: string,
    oldName: string,
    newName: string,
    newDescription: string,
    entityType: 'character' | 'setting' = 'character'
): Promise<string> {
    const text = await generateContent(
        `Update the following scenario to reflect ${entityType} changes. The ${entityType} previously named "${oldName}" is now named "${newName}" with the following updated description: "${newDescription}".

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Replace all references to "${oldName}" with "${newName}" (if the name changed)
2. Update any ${entityType} descriptions in the scenario to match the new ${entityType} description
3. Ensure the story flow and narrative remain coherent
4. Maintain the same tone and style as the original scenario
5. Keep the scenario length similar to the original

Return ONLY the updated scenario text, no additional formatting or explanations.`,
        geminiConfig
    );

    return text!.trim();
}

async function deleteFromScenarioText(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
    entityType: 'character' | 'setting' = 'character'
): Promise<string> {
    const text = await generateContent(
        `Delete the following ${entityType} from the scenario.

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Delete all references to "${oldName}" and "${oldDescription}" from the scenario
2. Ensure the story flow and narrative remain coherent
3. Maintain the same tone and style as the original scenario
4. Keep the scenario length similar to the original

Return ONLY the updated scenario text, no additional formatting or explanations.`,
        geminiConfig
    );
    return text!.trim();
}

// Generate character image from description
async function generateCharacterImage(description: string, style: string): Promise<string> {
    const orderedPrompt = {
        style,
        shot_type: "Medium Shot",
        description,
    };

    const imageResult = await generateImageRest(
        yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }),
        "1:1"
    );

    if (imageResult.predictions[0].raiFilteredReason) {
        throw new Error(
            `Image generation failed: ${imageResult.predictions[0].raiFilteredReason}`
        );
    }

    return imageResult.predictions[0].gcsUri;
}

async function generateSettingImage(description: string, style: string): Promise<string> {
    const orderedPrompt = {
        style,
        shot_type: "Wide Shot",
        description,
    };
    const imageResult = await generateImageRest(
        yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }),
        "16:9"
    );

    if (imageResult.predictions[0].raiFilteredReason) {
        throw new Error(
            `Image generation failed: ${imageResult.predictions[0].raiFilteredReason}`
        );
    }

    return imageResult.predictions[0].gcsUri;
}

async function styleImage(imageGcsUri: string, description: string, style: string): Promise<string> {
    const orderedPrompt = {
        style: style,
        //name: setting.name,
        shot_type: "Medium Shot",
        description: description,
    };
    const prompt = yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 })
    const newImageGcsUri = await generateImage(
        [createPartFromUri(imageGcsUri, 'image/png'), createPartFromText(prompt)]
    )
    return newImageGcsUri!
}

export async function deleteCharacterFromScenario(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
): Promise<ScenarioUpdateResult> {
    try {
        // Update scenario text
        const updatedScenario = await deleteFromScenarioText(
            currentScenario,
            oldName,
            oldDescription,
            'character'
        );

        return {
            updatedScenario,
        };
    } catch (error) {
        handleError('delete character from scenario text', error);
    }
    throw new Error('Unreachable code');
}

export async function deleteSettingFromScenario(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
): Promise<ScenarioUpdateResult> {
    try {
        const updatedScenario = await deleteFromScenarioText(
            currentScenario,
            oldName,
            oldDescription,
            'setting'
        );

        return {
            updatedScenario,
        };
    } catch (error) {
        handleError('delete setting from scenario text', error);
    }
    throw new Error('Unreachable code');
}


/**
 * Regenerate character and scenario from text input
 * Creates a new character image and updates the scenario accordingly
 */
export async function regenerateCharacterAndScenarioFromText(
    currentScenario: string,
    oldCharacterName: string,
    newCharacterName: string,
    newCharacterDescription: string,
    style: string
): Promise<ScenarioUpdateResult> {
    try {
        // Generate new character image
        const newImageGcsUri = await generateCharacterImage(newCharacterDescription, style);

        // Update scenario text
        const updatedScenario = await updateScenarioText(
            currentScenario,
            oldCharacterName,
            newCharacterName,
            newCharacterDescription,
            'character'
        );

        return {
            updatedScenario,
            newImageGcsUri,
        };
    } catch (error) {
        handleError('regenerate character and scenario from text', error);
    }
    throw new Error('Unreachable code');
}

/**
 * Regenerate character and scenario from image analysis
 * Analyzes an existing character image and updates both character description and scenario
 */
export async function regenerateCharacterAndScenarioFromImage(
    currentScenario: string,
    characterName: string,
    currentCharacterDescription: string,
    imageGcsUri: string,
    allCharacters: Character[],
    style: string
): Promise<ScenarioUpdateResult> {
    try {
        const characterListText = allCharacters
            .map((char) => `- ${char.name}: ${char.description}`)
            .join("\n");

        const text = await generateContent(
            [{
                fileData: {
                    fileUri: imageGcsUri,
                    mimeType: 'image/png',
                }
            },
            `Analyze the provided image and update both the character description and scenario text to match the visual characteristics shown.

CURRENT SCENARIO:
"${currentScenario}"

ALL CHARACTERS IN THE STORY:
${characterListText}

CHARACTER TO UPDATE (${characterName}):
"${currentCharacterDescription}"

INSTRUCTIONS:
1. Examine the uploaded image carefully
2. Update ONLY the description of ${characterName} to accurately reflect what you see in the image (appearance, clothing, features, etc.)
3. Update any references to ${characterName} in the scenario text to maintain consistency with the new appearance
4. PRESERVE ALL OTHER CHARACTERS - do not remove or modify descriptions of other characters
5. Keep the story as a multi-character narrative - maintain all character interactions and plot elements
6. Preserve the story narrative and flow, but ensure all descriptions of ${characterName} match the visual characteristics
7. Keep the same tone and style as the original text

Return both the updated scenario (maintaining all characters) and the updated description for ${characterName}.`],
            {
                ...geminiConfig,
                responseMimeType: 'application/json',
                responseSchema: z.toJSONSchema(CharacterScenarioUpdateSchema),
            }
        );

        const characterScenarioUpdate = JSON.parse(text!)
        const newImageGcsUri = await styleImage(imageGcsUri, characterScenarioUpdate.updatedCharacter.description, style)

        return {
            updatedScenario: characterScenarioUpdate.updatedScenario,
            updatedCharacter: characterScenarioUpdate.updatedCharacter,
            newImageGcsUri,
        };
    } catch (error) {
        handleError('regenerate character and scenario', error);
    }
    throw new Error('Unreachable code');
}

/**
 * Regenerate scenario from setting changes
 * Updates scenario text to reflect setting modifications
 */
export async function regenerateSettingAndScenarioFromText(
    currentScenario: string,
    oldSettingName: string,
    newSettingName: string,
    newSettingDescription: string,
    style: string
): Promise<ScenarioUpdateResult> {
    try {
        // Generate new character image
        const newImageGcsUri = await generateSettingImage(newSettingDescription, style);

        // Update scenario text
        const updatedScenario = await updateScenarioText(
            currentScenario,
            oldSettingName,
            newSettingName,
            newSettingDescription,
            'setting'
        );

        logger.debug(updatedScenario);

        return {
            updatedScenario,
            newImageGcsUri,
        };
    } catch (error) {
        handleError('regenerate scenario from setting', error);
    }
    throw new Error('Unreachable code');
}

/**
 * Regenerate character and scenario from image analysis
 * Analyzes an existing character image and updates both character description and scenario
 */
export async function regenerateSettingAndScenarioFromImage(
    currentScenario: string,
    settingName: string,
    currentSettingDescription: string,
    imageGcsUri: string,
    allSettings: Setting[],
    style: string
): Promise<ScenarioUpdateResult> {
    try {
        const settingListText = allSettings
            .map((setting) => `- ${setting.name}: ${setting.description}`)
            .join("\n");

        const text = await generateContent(
            [{
                fileData: {
                    fileUri: imageGcsUri,
                    mimeType: 'image/png',
                }
            },
            `Analyze the provided image and update both the setting description and scenario text to match the visual characteristics shown.

CURRENT SCENARIO:
"${currentScenario}"

ALL SETTINGS IN THE STORY:
${settingListText}

SETTING TO UPDATE (${settingName}):
"${currentSettingDescription}"

INSTRUCTIONS:
1. Examine the uploaded image carefully
2. Update ONLY the description of ${settingName} to accurately reflect what you see in the image
3. Update any references to ${settingName} in the scenario text to maintain consistency with the new setting
4. PRESERVE ALL OTHER SETTINGS - do not remove or modify descriptions of other settings
7. Preserve the story narrative and flow, but ensure all descriptions of ${settingName} match the visual characteristics
8. Keep the same tone and style as the original text

Return both the updated scenario (maintaining all settings) and the updated description for ${settingName}.`],
            {
                ...geminiConfig,
                responseMimeType: 'application/json',
                responseSchema: z.toJSONSchema(SettingScenarioUpdateSchema),
            }
        );

        const settingScenarioUpdate = JSON.parse(text!)
        const newImageGcsUri = await styleImage(imageGcsUri, settingScenarioUpdate.updatedSetting.description, style)

        return {
            updatedScenario: settingScenarioUpdate.updatedScenario,
            updatedSetting: settingScenarioUpdate.updatedSetting,
            newImageGcsUri,
        };
    } catch (error) {
        handleError('regenerate setting and scenario', error);
    }
    throw new Error('Unreachable code');
}
