import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject } from '@/lib/github-projects-db'
import { pushProjectToGithubMain } from '@/lib/github-repo-sync'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { projectId?: string }
  if (!body.projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const project = await getGithubProject({ userId, projectId: body.projectId })

  if (!project?.active_installation_id || !project.repo_owner || !project.repo_name) {
    return NextResponse.json(
      { error: 'Repository not connected yet' },
      { status: 400 }
    )
  }

  try {
    const branch = project.default_branch ?? 'main'

    const result = await pushProjectToGithubMain({
      installationId: project.active_installation_id,
      owner: project.repo_owner,
      repo: project.repo_name,
      branch,
      commitMessage: `Update from Thinksoft (${new Date().toISOString()})`,
    })

    return NextResponse.json({
      success: true,
      commitSha: result.commitSha,
      repository: {
        owner: project.repo_owner,
        name: project.repo_name,
        branch,
      },
    })
  } catch (error) {
    console.error('Error updating repo', error)
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    )
  }
}
