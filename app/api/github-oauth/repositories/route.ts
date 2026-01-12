import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import z from 'zod/v3'
import { createInstallationToken, githubRequest } from '@/lib/github-app'
import { getGithubProject, listGithubInstallations } from '@/lib/github-projects-db'

const QuerySchema = z.object({
  projectId: z.string().min(1),
  installationId: z.coerce.number().optional(),
})

type InstallationRepositoriesResponse = {
  total_count: number
  repositories: Array<{
    id: number
    name: string
    full_name: string
    private: boolean
    html_url: string
    default_branch: string
    owner: {
      login: string
    }
  }>
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    projectId: url.searchParams.get('projectId'),
    installationId: url.searchParams.get('installationId'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const projectId = parsed.data.projectId

  const [project, installations] = await Promise.all([
    getGithubProject({ userId, projectId }),
    listGithubInstallations({ userId, projectId }),
  ])

  const requestedInstallationId =
    typeof parsed.data.installationId === 'number' && Number.isFinite(parsed.data.installationId)
      ? parsed.data.installationId
      : project?.active_installation_id ?? null

  if (!requestedInstallationId) {
    return NextResponse.json({ error: 'Missing installationId' }, { status: 400 })
  }

  const isAllowed = installations.some((i) => i.installation_id === requestedInstallationId)
  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const token = await createInstallationToken(requestedInstallationId)

    const data = await githubRequest<InstallationRepositoriesResponse>(
      'GET',
      `/installation/repositories?per_page=100`,
      token
    )

    const repositories = (data.repositories ?? [])
      .map((r) => ({
        id: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        url: r.html_url,
        defaultBranch: r.default_branch,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))

    return NextResponse.json({ repositories })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
