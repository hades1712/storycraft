import { NextRequest, NextResponse } from 'next/server'
import { generateImageRest } from '@/lib/imagen'
import { imagePromptToString } from '@/lib/prompt-utils'
import { ImagePrompt } from '@/app/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Convert structured prompt to string if needed
    const promptString = typeof prompt === 'string' ? prompt : imagePromptToString(prompt as ImagePrompt)
    
    console.log('Regenerating image with prompt:', promptString)
    
    const resultJson = await generateImageRest(promptString)
    
    if (resultJson.predictions[0].raiFilteredReason) {
      throw new Error(resultJson.predictions[0].raiFilteredReason)
    } else {
      console.log('Generated image:', resultJson.predictions[0].gcsUri)
      return NextResponse.json({ 
        success: true,
        imageGcsUri: resultJson.predictions[0].gcsUri 
      })
    }
  } catch (error) {
    console.error('Error regenerating image:', error)
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
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'String prompt is required for character image' }, { status: 400 })
    }

    console.log('Regenerating character image with prompt:', prompt)
    
    const resultJson = await generateImageRest(prompt, "1:1", false)
    
    if (resultJson.predictions[0].raiFilteredReason) {
      throw new Error(resultJson.predictions[0].raiFilteredReason)
    } else {
      console.log('Generated character image:', resultJson.predictions[0].gcsUri)
      return NextResponse.json({ 
        success: true,
        imageGcsUri: resultJson.predictions[0].gcsUri 
      })
    }
  } catch (error) {
    console.error('Error regenerating character image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      success: false,
      error: 'Failed to regenerate character image',
      errorMessage 
    }, { status: 500 })
  }
}
