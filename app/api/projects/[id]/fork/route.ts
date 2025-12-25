import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { forkProject } from '@/lib/projects-db'
import { auth } from '@clerk/nextjs/server'

interface ProjectParams {
  id: string
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<ProjectParams> }
) {
  const projectParams = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await forkProject(userId, projectParams.id)
  if (!project) {
    return NextResponse.json({ error: 'Failed to fork project' }, { status: 500 })
  }

  return NextResponse.json(project)
}
