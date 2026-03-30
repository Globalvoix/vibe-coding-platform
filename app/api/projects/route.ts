import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createProject, listProjects } from '@/lib/projects-db'

export async function GET() {
  const { userId: clerkUserId } = await auth()
  const userId = clerkUserId ?? 'test-user-local'

  const projects = await listProjects(userId)
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  // TEST MODE: use authenticated user if available, otherwise fall back to a test id
  const { userId: clerkUserId } = await auth()
  const userId = clerkUserId ?? 'test-user-local'

  const body = await req.json().catch(() => ({})) as { prompt?: string }
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''

  if (!prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  // TEST MODE: subscription and limits gates are bypassed
  const project = await createProject(userId, prompt)
  return NextResponse.json(project, { status: 201 })
}
