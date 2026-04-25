import { isSupportedModelId, Models, type SupportedModelId } from '@/ai/constants'
import { getAvailableModels } from '@/ai/gateway'
import { getUserSubscription, isPaidSubscription } from '@/lib/subscription'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

type AvailableModel = Awaited<ReturnType<typeof getAvailableModels>>[number]

type SupportedAvailableModel = AvailableModel & {
  id: SupportedModelId
}

export async function GET() {
  const { userId } = await auth()
  const subscription = userId ? await getUserSubscription(userId) : null
  const canUsePaidModels = isPaidSubscription(subscription)

  const allModels = await getAvailableModels()
  const supported = allModels.filter(
    (model): model is SupportedAvailableModel => isSupportedModelId(model.id)
  )

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
