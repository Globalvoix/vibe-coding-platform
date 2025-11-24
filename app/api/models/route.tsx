import { SUPPORTED_MODELS } from '@/ai/constants'
import { getAvailableModels } from '@/ai/gateway'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const allModels = await getAvailableModels()
    return NextResponse.json({
      models: allModels.filter((model) => SUPPORTED_MODELS.includes(model.id)),
    })
  } catch (error) {
    console.error('Failed to fetch available models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available models. Please check AI Gateway configuration.' },
      { status: 500 }
    )
  }
}
