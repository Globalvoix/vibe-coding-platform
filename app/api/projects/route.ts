import { NextResponse } from 'next/server'
import { createProject, listProjects } from '@/lib/projects-db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const projects = await listProjects(userId)
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    prompt?: string
    userId?: string
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  const userId = typeof body.userId === 'string' ? body.userId : ''

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  if (!prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const project = await createProject(userId, prompt)
  return NextResponse.json(project, { status: 201 })
}
