import { NextRequest, NextResponse } from 'next/server'
import { generateImageRest } from '@/lib/imagen'
import { imagePromptToString } from '@/lib/prompt-utils'
import { Scenario, ImagePrompt } from '@/app/types'
import yaml from 'js-yaml'
import { createPartFromUri, createPartFromText } from '@google/genai';
import { generateImage } from '@/lib/gemini'
import logger from '@/app/logger';
import { getRAIUserMessage } from '@/lib/rai'
import { createCollage } from '@/app/actions/resize-image'
import { auth } from '@/auth';

//export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 🔐 认证检查：确保只有登录用户才能重新生成图片
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized image regeneration attempt');
      return NextResponse.json(
        { success: false, error: '请先登录后再重新生成图片' },
        { status: 401 }
      );
    }

    logger.info(`User ${session.user.id} is regenerating image`);

    const body = await request.json()
    const { prompt, scenario } = body as { prompt: ImagePrompt, scenario: Scenario }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const useR2I = true;
    if (useR2I) {
      const presentCharacters: Array<{ name: string, description: string, imageGcsUri?: string }> = scenario.characters.filter(character =>
        prompt.Subject.map(subject => subject.name).includes(character.name)
      );
      const props: Array<{ name: string, description: string, imageGcsUri?: string }> = scenario.props.filter(prop =>
        prompt.Prop?.map(prop => prop.name).includes(prop.name)
      );
      const settings: Array<{ name: string, description: string, imageGcsUri?: string }> = scenario.settings.filter(setting =>
        prompt.Context.map(context => context.name).includes(setting.name)
      );
      const orderedPrompt = {
        Style: prompt.Style,
        Scene: prompt.Scene,
        Composition: {
          shot_type: prompt.Composition.shot_type,
          lighting: prompt.Composition.lighting,
          overall_mood: prompt.Composition.overall_mood
        },
      };
      const promptString = yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 })
      logger.debug(`Prompt string:\n${promptString}`)

      let result;
      if (presentCharacters.length + props.length + settings.length <= 3) {
        const characterParts = presentCharacters.flatMap(character =>
          [createPartFromText(character.name), createPartFromUri(character.imageGcsUri!, 'image/png')]
        )
        const propsParts = props.flatMap(prop =>
          [createPartFromText(prop.name), createPartFromUri(prop.imageGcsUri!, 'image/png')]
        )
        const settingsParts = settings.flatMap(setting =>
          [createPartFromText(setting.name), createPartFromUri(setting.imageGcsUri!, 'image/png')]
        )
        result = await generateImage(
          characterParts.concat(propsParts).concat(settingsParts).concat([createPartFromText(promptString)])
        )
      } else {
        const collageUri = await createCollage(
          presentCharacters,
          props,
          scenario.aspectRatio
        );
        const settingsParts = settings.flatMap(setting =>
          [createPartFromText(setting.name), createPartFromUri(setting.imageGcsUri!, 'image/png')]
        )
        result = await generateImage(
          [createPartFromUri(collageUri, 'image/png')].concat(settingsParts).concat([createPartFromText(promptString)])
        )
      }
      return NextResponse.json(result);
    } else {
      // Convert structured prompt to string if needed
      const promptString = typeof prompt === 'string' ? prompt : imagePromptToString(prompt as ImagePrompt)

      logger.debug(`Regenerating image with prompt: ${promptString}`)

      const resultJson = await generateImageRest(promptString)

      if (resultJson.predictions[0].raiFilteredReason) {
        throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
      } else {
        logger.debug(`Generated image: ${resultJson.predictions[0].gcsUri}`)
        return NextResponse.json({
          success: true,
          imageGcsUri: resultJson.predictions[0].gcsUri
        })
      }
    }
  } catch (error) {
    logger.error('Error regenerating image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate image',
      errorMessage
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 🔐 认证检查：确保只有登录用户才能重新生成角色图片
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized character image regeneration attempt');
      return NextResponse.json(
        { success: false, error: '请先登录后再重新生成角色图片' },
        { status: 401 }
      );
    }

    logger.info(`User ${session.user.id} is regenerating character image`);

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'String prompt is required for character image' }, { status: 400 })
    }

    logger.debug(`Regenerating character image with prompt: ${prompt}`)

    const resultJson = await generateImageRest(prompt, "1:1", false)

    if (resultJson.predictions[0].raiFilteredReason) {
      throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
    } else {
      logger.debug(`Generated character image: ${resultJson.predictions[0].gcsUri}`)
      return NextResponse.json({
        success: true,
        imageGcsUri: resultJson.predictions[0].gcsUri
      })
    }
  } catch (error) {
    logger.error('Error regenerating character image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate character image',
      errorMessage
    }, { status: 500 })
  }
}
