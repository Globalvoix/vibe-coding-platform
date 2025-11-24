import { getAvailableModels } from '@/ai/gateway'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const models = await getAvailableModels()
    return NextResponse.json({ models })
  } catch (error) {
    console.error('Failed to fetch available models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    )
  }
}
