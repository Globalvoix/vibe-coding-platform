import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createProject, listProjects } from '@/lib/projects-db'

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

  const body = await req.json().catch(() => ({}))
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''

  if (!prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const project = await createProject(userId, prompt)
  return NextResponse.json(project, { status: 201 })
}
