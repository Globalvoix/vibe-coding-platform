import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject } from '@/lib/github-projects-db'
import { ensureGithubRepoForInstallation } from '@/lib/github-installation-flow'

function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

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
    if (!project?.active_installation_id) {
      return NextResponse.json({ error: 'No active organization selected' }, { status: 400 })
    }

    // If repo already exists, return it
    if (project.repo_owner && project.repo_name) {
      return NextResponse.json({
        success: true,
        repository: {
          owner: project.repo_owner,
          name: project.repo_name,
          url: `https://github.com/${project.repo_owner}/${project.repo_name}`,
          defaultBranch: project.default_branch || 'main',
        },
      })
    }

    const installationId = project.active_installation_id

    const repo = await ensureGithubRepoForInstallation({
      userId,
      projectId: body.projectId,
      installationId,
    })

    return NextResponse.json({
      success: true,
      repository: {
        owner: repo.owner.login,
        name: repo.name,
        url: `https://github.com/${repo.owner.login}/${repo.name}`,
        defaultBranch: repo.default_branch,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create repository'
    console.error('[GitHub Create Repo] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
