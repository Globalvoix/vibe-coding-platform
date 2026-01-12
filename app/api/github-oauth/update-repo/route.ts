import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject } from '@/lib/github-projects-db'
import { pushProjectToGithubMain } from '@/lib/github-repo-sync'

/**
 * Push project snapshot to GitHub main branch
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { projectId?: string }
  if (!body.projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  try {
    const project = await getGithubProject({ userId, projectId: body.projectId })

    if (!project?.active_installation_id || !project.repo_owner || !project.repo_name) {
      return NextResponse.json(
        { error: 'Repository not connected' },
        { status: 400 }
      )
    }

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
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GitHub Update Repo] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
