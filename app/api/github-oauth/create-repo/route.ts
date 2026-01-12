import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createInstallationToken, getInstallation, githubRequest } from '@/lib/github-app'
import { getGithubProject, upsertGithubProject } from '@/lib/github-projects-db'
import type { GithubRepository } from '@/lib/github-types'

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

    // Create new repository
    const installationId = project.active_installation_id
    const installation = await getInstallation(installationId)
    const account = installation.account

    const token = await createInstallationToken(installationId)
    const repoName = sanitizeRepoName(`thinksoft-${body.projectId}`)

    const repoPath =
      account.type === 'Organization'
        ? `/orgs/${encodeURIComponent(account.login)}/repos`
        : '/user/repos'

    const repo = await githubRequest<GithubRepository>('POST', repoPath, token, {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Thinksoft project ${body.projectId}`,
    })

    // Save to DB
    await upsertGithubProject({
      userId,
      projectId: body.projectId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoId: repo.id,
      defaultBranch: repo.default_branch,
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
