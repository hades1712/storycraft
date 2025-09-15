import { NextRequest, NextResponse } from 'next/server'
import { firestore } from '@/lib/firestore'
import { auth } from '@/auth'
import { Timestamp } from '@google-cloud/firestore'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { scenario, scenarioId } = body

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario data is required' }, { status: 400 })
    }

    // Generate a unique ID if not provided
    const id = scenarioId || firestore.collection('scenarios').doc().id

    // Prepare the scenario data for Firestore (filter out undefined values)
    const baseScenario = {
      id,
      userId,
      name: scenario.name || '',
      pitch: scenario.pitch || '',
      scenario: scenario.scenario || '',
      aspectRatio: scenario.aspectRatio || '16:9',
      durationSeconds: scenario.durationSeconds || 8,
      style: scenario.style || '',
      genre: scenario.genre || '',
      mood: scenario.mood || '',
      music: scenario.music || '',
      language: scenario.language || { name: 'English (United States)', code: 'en-US' },
      characters: scenario.characters || [],
      props: scenario.props || [],
      settings: scenario.settings || [],
      scenes: (scenario.scenes || []).map((scene: any) => {
        const sceneData: any = {
          imagePrompt: scene.imagePrompt,
          videoPrompt: scene.videoPrompt,
          description: scene.description || '',
          voiceover: scene.voiceover || '',
          charactersPresent: scene.charactersPresent || [],
        }
        
        // Only add optional fields if they have values
        if (scene.imageGcsUri) sceneData.imageGcsUri = scene.imageGcsUri
        if (typeof scene.videoUri === 'string') sceneData.videoUri = scene.videoUri
        if (typeof scene.voiceoverAudioUri === 'string') sceneData.voiceoverAudioUri = scene.voiceoverAudioUri
        if (scene.errorMessage) sceneData.errorMessage = scene.errorMessage
        
        return sceneData
      })
    }

    // Add optional fields only if they have values
    const firestoreScenario: any = { ...baseScenario }
    if (scenario.musicUrl) firestoreScenario.musicUrl = scenario.musicUrl
    if (scenario.logoOverlay) firestoreScenario.logoOverlay = scenario.logoOverlay

    const scenarioRef = firestore.collection('scenarios').doc(id)
    const scenarioDoc = await scenarioRef.get()

    if (scenarioDoc.exists) {
      // Update existing scenario
      await scenarioRef.update({
        ...firestoreScenario,
        updatedAt: Timestamp.now()
      })
    } else {
      // Create new scenario
      await scenarioRef.set({
        ...firestoreScenario,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    }

    return NextResponse.json({ 
      success: true, 
      scenarioId: id 
    })
  } catch (error) {
    console.error('Error saving scenario:', error)
    return NextResponse.json(
      { error: 'Failed to save scenario' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('id')

    if (scenarioId) {
      // Get specific scenario
      const scenarioRef = firestore.collection('scenarios').doc(scenarioId)
      const scenarioDoc = await scenarioRef.get()

      if (!scenarioDoc.exists) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }

      const scenarioData = scenarioDoc.data()
      
      // Check if user owns this scenario
      if (scenarioData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      return NextResponse.json({
        id: scenarioId,
        ...scenarioData
      })
    } else {
      // Get all scenarios for user
      const scenariosRef = firestore.collection('scenarios')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
      
      const scenariosSnapshot = await scenariosRef.get()
      const scenarios = scenariosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      

      return NextResponse.json({ scenarios })
    }
  } catch (error) {
    console.error('Error fetching scenarios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('id')

    if (!scenarioId) {
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 })
    }

    // Get the scenario to verify ownership
    const scenarioRef = firestore.collection('scenarios').doc(scenarioId)
    const scenarioDoc = await scenarioRef.get()

    if (!scenarioDoc.exists) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const scenarioData = scenarioDoc.data()
    
    // Check if user owns this scenario
    if (scenarioData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the scenario
    await scenarioRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scenario:', error)
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    )
  }
}