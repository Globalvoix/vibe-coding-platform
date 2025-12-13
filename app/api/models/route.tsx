import { SUPPORTED_MODELS, Models } from '@/ai/constants'
import { getAvailableModels } from '@/ai/gateway'
import { getUserSubscription, isPaidSubscription } from '@/lib/subscription'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  const subscription = userId ? await getUserSubscription(userId) : null
  const canUsePaidModels = isPaidSubscription(subscription)

  const allModels = await getAvailableModels()
  const supported = allModels.filter((model) => SUPPORTED_MODELS.includes(model.id))

  return NextResponse.json({
    models: supported.map((model) => {
      if (model.id === Models.AnthropicClaude45Sonnet) {
        return {
          ...model,
          enabled: canUsePaidModels,
          requiresPaid: true,
        }
      }

      return {
        ...model,
        enabled: true,
      }
    }),
  })
}
