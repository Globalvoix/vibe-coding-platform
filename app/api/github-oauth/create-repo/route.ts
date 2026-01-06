import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createInstallationToken, getInstallation, githubInstallationRequest } from '@/lib/github-app'
import { getGithubProject, upsertGithubProject } from '@/lib/github-projects-db'

function sanitizeRepoName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
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

  const project = await getGithubProject({ userId, projectId: body.projectId })
  if (!project?.active_installation_id) {
    return NextResponse.json(
      { error: 'No active organization selected' },
      { status: 400 }
    )
  }

  if (project.repo_owner && project.repo_name) {
    return NextResponse.json({
      success: true,
      repository: {
        owner: project.repo_owner,
        name: project.repo_name,
        url: `https://github.com/${project.repo_owner}/${project.repo_name}`,
        defaultBranch: project.default_branch ?? 'main',
      },
    })
  }

  try {
    const installationId = project.active_installation_id
    const installation = await getInstallation(installationId)
    const account = installation.account

    const installationToken = await createInstallationToken(installationId)

    const repoName = sanitizeRepoName(`thinksoft-${body.projectId}`)

    const createBody = {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Thinksoft project ${body.projectId}`,
    }

    const repo =
      account.type === 'Organization'
        ? await githubInstallationRequest<{
            id: number
            name: string
            owner: { login: string }
            default_branch: string
            html_url: string
          }>({
            method: 'POST',
            path: `/orgs/${encodeURIComponent(account.login)}/repos`,
            installationToken,
            body: createBody,
          })
        : await githubInstallationRequest<{
            id: number
            name: string
            owner: { login: string }
            default_branch: string
            html_url: string
          }>({
            method: 'POST',
            path: `/user/repos`,
            installationToken,
            body: createBody,
          })

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
        url: repo.html_url,
        defaultBranch: repo.default_branch,
      },
    })
  } catch (error) {
    console.error('Error creating repo', error)
    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 }
    )
  }
}
