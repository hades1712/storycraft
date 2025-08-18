'use server'

import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen';
import { getScenarioPrompt, getScenesPrompt2 } from '@/app/prompts';
import { generateText } from '@/lib/gemini'
import { Type } from '@google/genai';
import { imagePromptToString } from '@/lib/prompt-utils';

import { Scenario, Language, ImagePrompt } from "../types"

export async function generateScenario(name: string, pitch: string, numScenes: number, style: string, language: Language): Promise<Scenario> {
  try {
    const prompt = getScenarioPrompt(pitch, numScenes, style, language);
    console.log('Create a scenario')
    const text = await generateText(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
      }
    )
    console.log('text', text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenario: Scenario
    try {
      const parsedScenario = JSON.parse(text);
      console.log('json', parsedScenario)

      // Ensure the language is set correctly and add name, pitch, and style
      scenario = {
        ...parsedScenario,
        name: name,
        pitch: pitch,
        style: style,
        language: {
          name: language.name,
          code: language.code
        }
      };

      console.log(scenario.scenario)
      console.log(scenario.characters)
      console.log(scenario.settings)
    } catch (parseError) {
      console.error('Error parsing AI response:', text)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    const charactersWithImages = await Promise.all(scenario.characters.map(async (character, index) => {
      try {
        console.log(`Generating image for scene ${index + 1}`);
        // Define the order explicitly
        const orderedPrompt = {
          style: style,
          name: character.name,
          shot_type: "Full Shot",
          description: character.description,
        };
        const resultJson = await generateImageRest(JSON.stringify(orderedPrompt, null, 4), "1:1");
        if (resultJson.predictions[0].raiFilteredReason) {
          throw new Error(resultJson.predictions[0].raiFilteredReason)
        } else {
          console.log('Generated image:', resultJson.predictions[0].gcsUri);
          return { ...character, imageGcsUri: resultJson.predictions[0].gcsUri };
        }
      } catch (error) {
        console.error('Error generating image:', error);
        return { ...character, imageGcsUri: undefined };
      }
    }))

    scenario.characters = charactersWithImages
    return scenario
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


export async function generateStoryboard(scenario: Scenario, numScenes: number, style: string, language: Language): Promise<Scenario> {
  console.log('Create a storyboard')
  console.log(scenario.scenario)
  try {
    // Create a new scenario object to ensure proper serialization
    const newScenario: Scenario = {
      ...scenario,
      scenes: []
    };

    const prompt = getScenesPrompt2(scenario, numScenes, style, language)
    const text = await generateText(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            'scenes': {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  'imagePrompt': {
                    type: Type.OBJECT,
                    nullable: false,
                    properties: {
                      'Style': {
                        type: Type.STRING,
                        nullable: false,
                      },
                      'Composition': {
                        type: Type.OBJECT,
                        nullable: false,
                        properties: {
                          'shot_type': {
                            type: Type.STRING,
                            nullable: false,
                          },
                          'lighting': {
                            type: Type.STRING,
                            nullable: false,
                          },
                          'overall_mood': {
                            type: Type.STRING,
                            nullable: false,
                          }
                        },
                        required: ['shot_type', 'lighting', 'overall_mood'],
                      },
                      'Subject': {
                        type: Type.ARRAY,
                        nullable: false,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            'name': {
                              type: Type.STRING,
                              nullable: false,
                            },
                            'description': {
                              type: Type.STRING,
                              nullable: false,
                            }
                          },
                          required: ['name', 'description'],
                        }
                      },
                      'Context': {
                        type: Type.ARRAY,
                        nullable: false,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            'name': {
                              type: Type.STRING,
                              nullable: false,
                            },
                            'description': {
                              type: Type.STRING,
                              nullable: false,
                            }
                          },
                          required: ['name', 'description'],
                        }
                      },
                      'Scene': {
                        type: Type.STRING,
                        nullable: false,
                      }
                    },
                    required: ['Style', 'Composition', 'Subject', 'Context', 'Scene'],
                  },
                  'videoPrompt': {
                    type: Type.OBJECT,
                    nullable: false,
                    properties: {
                      'Action': {
                        type: Type.STRING,
                        nullable: false,
                      },
                      'Camera_Motion': {
                        type: Type.STRING,
                        nullable: false,
                      },
                      'Ambiance_Audio': {
                        type: Type.STRING,
                        nullable: false,
                      },
                      'Dialogue': {
                        type: Type.ARRAY,
                        nullable: false,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            'speaker': {
                              type: Type.STRING,
                              nullable: false,
                            },
                            'line': {
                              type: Type.STRING,
                              nullable: false,
                            }
                          },
                          required: ['speaker', 'line'],
                        }
                      }
                    },
                    required: ['Action', 'Camera_Motion', 'Ambiance_Audio', 'Dialogue'],
                  },
                  'description': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'voiceover': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'charactersPresent': {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING
                    }
                  }
                },
                required: ['imagePrompt', 'videoPrompt', 'description', 'voiceover', 'charactersPresent'],
              }
            }
          },
          required: ['scenes'],
        },
      }
    )
    console.log('text', text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    try {
      const parsedScenes = JSON.parse(text);
      newScenario.scenes = parsedScenes.scenes
      console.log('Server side scenes after parsing:', newScenario.scenes)
    } catch (parseError) {
      console.error('Error parsing AI response:', text)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    // Generate images for each scene
    const scenesWithImages = await Promise.all(newScenario.scenes.map(async (scene, index) => {
      try {
        console.log(`Generating image for scene ${index + 1}`);
        let resultJson;
        const useR2I = false;
        if (useR2I && scene.charactersPresent.length > 0) {
          const presentCharacters = newScenario.characters.filter(character =>
            scene.charactersPresent.includes(character.name)
          );
          if (presentCharacters.length > 0) {
            console.log(`Using character customization for characters: ${presentCharacters.map(c => c.name).join(', ')}`);
            resultJson = await generateImageCustomizationRest(imagePromptToString(scene.imagePrompt), presentCharacters);
          } else {
            console.warn(`Scene ${index + 1} listed characters [${scene.charactersPresent.join(', ')}] but no matching data found in charactersWithImages. Falling back to standard generation.`);
            resultJson = await generateImageRest(imagePromptToString(scene.imagePrompt));
          }
        } else {
          resultJson = await generateImageRest(imagePromptToString(scene.imagePrompt));
        }
        if (resultJson.predictions[0].raiFilteredReason) {
          throw new Error(resultJson.predictions[0].raiFilteredReason)
        } else {
          console.log('Generated image:', resultJson.predictions[0].gcsUri);
          return { ...scene, imageGcsUri: resultJson.predictions[0].gcsUri };
        }
      } catch (error) {
        console.error('Error generating image:', error);
        if (error instanceof Error) {
          return { ...scene, imageGcsUri: undefined, errorMessage: error.message };
        } else {
          return { ...scene, imageGcsUri: undefined };
        }
      }
    }));

    newScenario.scenes = scenesWithImages
    // Create a fresh copy to ensure proper serialization
    return JSON.parse(JSON.stringify(newScenario))
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

