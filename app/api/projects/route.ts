import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createProject, listProjects, countProjectsCreatedSince } from '@/lib/projects-db'
import { getUserSubscription, initializeFreeSubscription, getPlanLimits } from '@/lib/subscription'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await listProjects(userId)
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { prompt?: string }
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''

  if (!prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  let subscription = await getUserSubscription(userId)
  if (!subscription) {
    subscription = await initializeFreeSubscription(userId)
  }

  const planId = subscription?.plan_id ?? 'free'
  const limits = await getPlanLimits(planId)

  if (Number.isFinite(limits.apps)) {
    const now = new Date()
    const periodStart = subscription?.current_period_start
      ? new Date(subscription.current_period_start)
      : new Date(now.getFullYear(), now.getMonth(), 1)

    const appsThisPeriod = await countProjectsCreatedSince(userId, periodStart)

    if (appsThisPeriod >= limits.apps) {
      return NextResponse.json(
        {
          error: 'App limit reached for your current plan.',
          code: 'APP_LIMIT_REACHED',
          planId,
          limit: limits.apps,
        },
        { status: 403 }
      )
    }
  }

  const project = await createProject(userId, prompt)
  return NextResponse.json(project, { status: 201 })
}
