import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import z from 'zod/v3'
import { createInstallationToken, githubRequest } from '@/lib/github-app'
import type { GithubCommit, GithubGitRef } from '@/lib/github-types'
import { getProject } from '@/lib/projects-db'
import { listGithubInstallations, upsertGithubProject } from '@/lib/github-projects-db'
import { replaceProjectFiles } from '@/lib/project-files-db'

const BodySchema = z.object({
  projectId: z.string().min(1),
  installationId: z.number().int().positive(),
  owner: z.string().min(1),
  repo: z.string().min(1),
})

type RepoResponse = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  owner: {
    login: string
  }
}

type TreeEntry = {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

type TreeResponse = {
  sha: string
  truncated?: boolean
  tree: TreeEntry[]
}

type BlobResponse = {
  sha: string
  size: number
  encoding: 'base64'
  content: string
}

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'bmp',
  'pdf',
  'zip',
  'tar',
  'gz',
  'tgz',
  '7z',
  'mp4',
  'mov',
  'webm',
  'mp3',
  'wav',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
])

function isProbablyBinaryPath(filePath: string): boolean {
  const base = filePath.split('/').pop() ?? filePath
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : ''
  if (!ext) return false
  return BINARY_EXTENSIONS.has(ext)
}

function decodeMaybeText(params: { contentBase64: string; path: string }) {
  const buf = Buffer.from(params.contentBase64, 'base64')

  if (buf.length === 0) {
    return { encoding: 'utf8' as const, content: '' }
  }

  if (isProbablyBinaryPath(params.path)) {
    return { encoding: 'base64' as const, content: params.contentBase64 }
  }

  const asText = buf.toString('utf8')
  if (asText.includes('\uFFFD')) {
    return { encoding: 'base64' as const, content: params.contentBase64 }
  }

  return { encoding: 'utf8' as const, content: asText }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const currentIndex = index
      index += 1
      if (currentIndex >= items.length) return

      results[currentIndex] = await fn(items[currentIndex])
    }
  })

  await Promise.all(workers)
  return results
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const { projectId, installationId, owner, repo } = parsed.data

  const project = await getProject(userId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const installations = await listGithubInstallations({ userId, projectId })
  const isAllowed = installations.some((i) => i.installation_id === installationId)
  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const token = await createInstallationToken(installationId)

    const repoInfo = await githubRequest<RepoResponse>(
      'GET',
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token
    )

    const branch = repoInfo.default_branch || 'main'

    const ref = await githubRequest<GithubGitRef>(
      'GET',
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
      token
    )

    const baseCommitSha = ref.object.sha

    const commit = await githubRequest<GithubCommit>(
      'GET',
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(baseCommitSha)}`,
      token
    )

    const tree = await githubRequest<TreeResponse>(
      'GET',
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commit.tree.sha)}?recursive=1`,
      token
    )

    const blobs = (tree.tree ?? []).filter((e) => e.type === 'blob' && typeof e.path === 'string' && e.path)

    const maxBytes = 1_000_000
    const fetchConcurrency = 8

    let skippedTooLarge = 0
    let skippedMissing = 0

    const files = await mapWithConcurrency(blobs, fetchConcurrency, async (entry) => {
      const blob = await githubRequest<BlobResponse>(
        'GET',
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(entry.sha)}`,
        token
      )

      if (!blob?.content) {
        skippedMissing += 1
        return null
      }

      const base64 = blob.content.replace(/\n/g, '')
      const buf = Buffer.from(base64, 'base64')
      if (buf.length > maxBytes) {
        skippedTooLarge += 1
        return null
      }

      const decoded = decodeMaybeText({ contentBase64: base64, path: entry.path })

      return {
        path: entry.path,
        content: decoded.content,
        encoding: decoded.encoding,
      }
    })

    const normalizedFiles = files.filter((f): f is NonNullable<typeof f> => Boolean(f))

    await replaceProjectFiles({ userId, projectId, files: normalizedFiles })

    await upsertGithubProject({
      userId,
      projectId,
      activeInstallationId: installationId,
      repoOwner: repoInfo.owner.login,
      repoName: repoInfo.name,
      repoId: repoInfo.id,
      defaultBranch: branch,
    })

    return NextResponse.json({
      imported: true,
      repository: {
        owner: repoInfo.owner.login,
        name: repoInfo.name,
        url: repoInfo.html_url,
        defaultBranch: branch,
      },
      counts: {
        imported: normalizedFiles.length,
        skippedTooLarge,
        skippedMissing,
      },
      truncated: Boolean(tree.truncated),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
