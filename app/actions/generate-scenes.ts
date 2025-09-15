'use server'

import { generateImageRest } from '@/lib/imagen';
import { getScenarioPrompt, getScenesPrompt } from '@/app/prompts';
import { generateContent, generateImage } from '@/lib/gemini'
import { Type } from '@google/genai';
import { imagePromptToString } from '@/lib/prompt-utils';
import yaml from 'js-yaml'
import { createPartFromUri, createPartFromText } from '@google/genai';
import { getRAIUserMessage } from '@/lib/rai'

import { Scenario, Language } from "../types"
import logger from '../logger';

export async function generateScenario(name: string, pitch: string, numScenes: number, style: string, aspectRatio: string, durationSeconds: number, language: Language, modelName: string = 'gemini-2.5-flash', thinkingBudget: number = 0): Promise<Scenario> {
  try {
    const prompt = getScenarioPrompt(pitch, numScenes, style, language);
    logger.debug('Create a scenario')
    const text = await generateContent(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: thinkingBudget,
        },
        responseMimeType: 'application/json',
      },
      modelName
    )
    logger.debug(text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenario: Scenario
    try {
      // remove markdown
      const textWithoutMarkdown = text.replace(/```json/g, '').replace(/```/g, '')
      const parsedScenario = JSON.parse(textWithoutMarkdown);
      logger.debug(parsedScenario)

      // Ensure the language is set correctly and add name, pitch, style, and aspect ratio
      scenario = {
        ...parsedScenario,
        name: name,
        pitch: pitch,
        style: style,
        props: parsedScenario.props || [],
        aspectRatio: aspectRatio,
        durationSeconds: durationSeconds,
        language: {
          name: language.name,
          code: language.code
        }
      };

      logger.debug(JSON.stringify(scenario, null, 4))
    } catch (parseError) {
      logger.error('Error parsing AI response:', parseError)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    // Generate all images (characters and settings) simultaneously
    const [charactersWithImages, settingsWithImages, propsWithImages] = await Promise.all([
      Promise.all(scenario.characters.map(async (character, index) => {
        try {
          logger.debug(`Generating image for character ${index + 1}: ${character.name}`);
          // Define the order explicitly
          const orderedPrompt = {
            style: style,
            //name: character.name,
            shot_type: "Medium Shot",
            description: character.description,
            // prohibited_elements: "watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
          };
          const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1");
          if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(getRAIUserMessage(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason)))
          } else {
            logger.debug(`Generated character image: ${resultJson.predictions[0].gcsUri}`);
            return { ...character, imageGcsUri: resultJson.predictions[0].gcsUri };
          }
        } catch (error) {
          logger.error('Error generating character image:', error);
          return { ...character, imageGcsUri: undefined };
        }
      })),
      Promise.all(scenario.settings.map(async (setting, index) => {
        try {
          logger.debug(`Generating image for setting ${index + 1}: ${setting.name}`);
          // Define the order explicitly
          const orderedPrompt = {
            style: style,
            //name: setting.name,
            shot_type: "Wide Shot",
            description: setting.description,
            //prohibited_elements: "people, characters, watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
          };
          const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), aspectRatio);
          if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
          } else {
            logger.debug(`Generated setting image: ${resultJson.predictions[0].gcsUri}`);
            return { ...setting, imageGcsUri: resultJson.predictions[0].gcsUri };
          }
        }
        catch (error) {
          logger.error('Error generating setting image:', error);
          return { ...setting, imageGcsUri: undefined };
        }
      })),
      Promise.all(scenario.props?.map(async (prop, index) => {
        try {
          logger.debug(`Generating image for prop ${index + 1}: ${prop.name}`);
          // Define the order explicitly
          const orderedPrompt = {
            style: style,
            //name: prop.name,
            shot_type: "Close Shot",
            description: prop.description,
            //prohibited_elements: "people, characters, watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
          };
          const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1");
          if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
          } else {
            logger.debug(`Generated prop image: ${resultJson.predictions[0].gcsUri}`);
            return { ...prop, imageGcsUri: resultJson.predictions[0].gcsUri };
          }
        }
        catch (error) {
          logger.error('Error generating prop image:', error);
          return { ...prop, imageGcsUri: undefined };
        }
      }))
    ]);

    scenario.characters = charactersWithImages
    scenario.settings = settingsWithImages
    scenario.props = propsWithImages
    return scenario
  } catch (error) {
    logger.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


export async function generateStoryboard(scenario: Scenario, numScenes: number, style: string, language: Language): Promise<Scenario> {
  logger.debug('Create a storyboard')
  logger.debug(scenario.scenario)
  try {
    // Create a new scenario object to ensure proper serialization
    const newScenario: Scenario = {
      ...scenario,
      scenes: []
    };

    const prompt = getScenesPrompt(scenario, numScenes, style, language)
    const text = await generateContent(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
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
                            }
                          },
                          required: ['name'],
                        }
                      },
                      'Prop': {
                        type: Type.ARRAY,
                        nullable: false,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            'name': {
                              type: Type.STRING,
                              nullable: false,
                            }
                          },
                          required: ['name'],
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
                            }
                          },
                          required: ['name'],
                        }
                      },
                      'Scene': {
                        type: Type.STRING,
                        nullable: false,
                      }
                    },
                    required: ['Style', 'Composition', 'Subject', 'Prop', 'Context', 'Scene'],
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
                            'name': {
                              type: Type.STRING,
                              nullable: false,
                            },
                            'speaker': {
                              type: Type.STRING,
                              nullable: false,
                            },
                            'line': {
                              type: Type.STRING,
                              nullable: false,
                            }
                          },
                          required: ['name', 'speaker', 'line'],
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
    logger.debug(text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    try {
      const parsedScenes = JSON.parse(text);
      newScenario.scenes = parsedScenes.scenes
      logger.debug(`Server side scenes after parsing: ${JSON.stringify(newScenario.scenes, null, 4)}`)
    } catch (parseError) {
      logger.error('Error parsing AI response:', parseError)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    // Generate images for each scene
    const scenesWithImages = await Promise.all(newScenario.scenes.map(async (scene, index) => {
      try {
        logger.debug(`Generating image for scene ${index + 1}`);
        let resultJson;
        const useR2I = true;
        if (useR2I && scene.charactersPresent.length > 0) {
          const presentCharacters: Array<{ name: string, description: string, imageGcsUri?: string }> = newScenario.characters.filter(character =>
            scene.imagePrompt.Subject.map(subject => subject.name).includes(character.name)
          );
          const props: Array<{ name: string, description: string, imageGcsUri?: string }> = newScenario.props.filter(prop =>
            scene.imagePrompt.Prop?.map(prop => prop.name).includes(prop.name)
          );
          const settings: Array<{ name: string, description: string, imageGcsUri?: string }> = newScenario.settings.filter(setting =>
            scene.imagePrompt.Context.map(context => context.name).includes(setting.name)
          );
          const imagePrompt = scene.imagePrompt
          const orderedPrompt = {
            Style: imagePrompt.Style,
            Scene: imagePrompt.Scene,
            Composition: {
              shot_type: imagePrompt.Composition.shot_type,
              lighting: imagePrompt.Composition.lighting,
              overall_mood: imagePrompt.Composition.overall_mood
            },
          };
          const prompt = yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 })
          const characterParts = presentCharacters.flatMap(character =>
            [createPartFromText(character.name), createPartFromUri(character.imageGcsUri!, 'image/png')]
          )
          const propsParts = props.flatMap(prop =>
            [createPartFromText(prop.name), createPartFromUri(prop.imageGcsUri!, 'image/png')]
          )
          const settingsParts = settings.flatMap(setting =>
            [createPartFromText(setting.name), createPartFromUri(setting.imageGcsUri!, 'image/png')]
          )
          const result = await generateImage(
            characterParts.concat(propsParts).concat(settingsParts).concat([createPartFromText(prompt)])
          )
          if (result.success) {
            return { ...scene, imageGcsUri: result.imageGcsUri };
          } else {
            throw { ...scene, errorMessage: result.errorMessage };
          }
        } else {
          resultJson = await generateImageRest(imagePromptToString(scene.imagePrompt));
          if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
          } else {
            logger.debug(`Generated image: ${resultJson.predictions[0].gcsUri}`);
            return { ...scene, imageGcsUri: resultJson.predictions[0].gcsUri };
          }
        }

      } catch (error) {
        logger.error('Error generating image:', error);
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
    logger.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

