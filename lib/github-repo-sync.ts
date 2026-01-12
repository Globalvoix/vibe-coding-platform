import path from 'node:path'
import fs from 'node:fs/promises'
import { createInstallationToken, githubRequest } from '@/lib/github-app'
import { listProjectFiles } from '@/lib/project-files-db'
import type { GithubGitRef, GithubCommit, GithubBlob, GithubTree } from '@/lib/github-types'

const DEFAULT_INCLUDE_PATHS = [
  'app',
  'components',
  'hooks',
  'lib',
  'public',
  'types',
  'ai',
  'supabase',
  'middleware.ts',
  'instrumentation-client.ts',
  'next.config.mjs',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'tsconfig.json',
  'components.json',
  'markdown.d.ts',
  'package.json',
  'pnpm-lock.yaml',
  'package-lock.json',
  'README.md',
]

const DEFAULT_EXCLUDE_DIRS = new Set(['.next', 'node_modules', '.git'])
const DEFAULT_EXCLUDE_FILES = [/^\.env(\.|$)/, /\.pem$/i]

async function exists(p: string) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function walkFiles(params: {
  rootDir: string
  relDir: string
  out: string[]
}) {
  const absDir = path.join(params.rootDir, params.relDir)
  const entries = await fs.readdir(absDir, { withFileTypes: true })

  for (const entry of entries) {
    const relPath = path.posix
      .join(params.relDir.split(path.sep).join(path.posix.sep), entry.name)
      .replace(/^\.?\/?/, '')

    if (entry.isDirectory()) {
      if (DEFAULT_EXCLUDE_DIRS.has(entry.name)) continue
      await walkFiles({ rootDir: params.rootDir, relDir: path.join(params.relDir, entry.name), out: params.out })
      continue
    }

    if (DEFAULT_EXCLUDE_FILES.some((r) => r.test(entry.name))) continue

    params.out.push(relPath)
  }
}

type SnapshotItem = { path: string; contentBase64: string }

function shouldExcludePath(p: string): boolean {
  const normalized = p.replace(/\\/g, '/').replace(/^\/+/, '')

  if (normalized.startsWith('.git/')) return true
  if (normalized.startsWith('node_modules/')) return true
  if (normalized.startsWith('.next/')) return true
  if (normalized.startsWith('.vercel/')) return true
  if (normalized.startsWith('dist/')) return true
  if (normalized.startsWith('build/')) return true

  // Common editor / OS junk
  const baseName = normalized.split('/').pop() ?? normalized
  if (baseName === '.DS_Store') return true
  if (baseName === 'Thumbs.db') return true

  // Platform/sandbox artifacts that should never land in a user's repo
  if (normalized.startsWith('sandbox/')) return true
  if (normalized.startsWith('sandboxes/')) return true
  if (normalized.includes('/sandbox/')) return true
  if (normalized.startsWith('prompts/')) return true
  if (normalized.includes('/prompts/')) return true
  if (baseName === 'prompt.md') return true

  if (/^\.env(\.|$)/.test(baseName)) return true
  if (/\.pem$/i.test(baseName)) return true

  return false
}

async function getSnapshotFromFs(rootDir: string): Promise<SnapshotItem[]> {
  const files: string[] = []

  for (const includePath of DEFAULT_INCLUDE_PATHS) {
    const abs = path.join(rootDir, includePath)
    if (!(await exists(abs))) continue

    const stat = await fs.stat(abs)

    if (stat.isDirectory()) {
      await walkFiles({ rootDir, relDir: includePath, out: files })
    } else {
      files.push(includePath)
    }
  }

  files.sort()

  const items: SnapshotItem[] = []

  for (const rel of files) {
    if (shouldExcludePath(rel)) continue

    const abs = path.join(rootDir, rel)
    const stat = await fs.stat(abs)

    if (stat.size > 1_000_000) {
      continue
    }

    const buf = await fs.readFile(abs)
    items.push({ path: rel.replace(/\\/g, '/'), contentBase64: buf.toString('base64') })
  }

  return items
}

async function getSnapshotFromPersistedProject(params: {
  userId: string
  projectId: string
}): Promise<SnapshotItem[]> {
  const rows = await listProjectFiles({ userId: params.userId, projectId: params.projectId })

  const items: SnapshotItem[] = []

  for (const row of rows) {
    const filePath = row.path.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!filePath || shouldExcludePath(filePath)) continue

    const buf = Buffer.from(
      row.content ?? '',
      row.encoding === 'base64' ? 'base64' : 'utf8'
    )

    if (buf.length > 1_000_000) continue

    items.push({ path: filePath, contentBase64: buf.toString('base64') })
  }

  items.sort((a, b) => a.path.localeCompare(b.path))
  return items
}

async function pushSnapshotToGithubMain(params: {
  installationId: number
  owner: string
  repo: string
  branch: string
  commitMessage: string
  snapshot: SnapshotItem[]
  replaceTree?: boolean
}) {
  const installationToken = await createInstallationToken(params.installationId)

  const ref = await githubRequest<GithubGitRef>(
    'GET',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/ref/heads/${encodeURIComponent(params.branch)}`,
    installationToken
  )

  const baseCommitSha = ref.object.sha

  const baseCommit = await githubRequest<GithubCommit>(
    'GET',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/commits/${baseCommitSha}`,
    installationToken
  )

  const baseTreeSha = baseCommit.tree.sha

  const treeEntries: { path: string; mode: string; type: string; sha: string }[] = []

  for (const file of params.snapshot) {
    const blob = await githubRequest<GithubBlob>(
      'POST',
      `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/blobs`,
      installationToken,
      { content: file.contentBase64, encoding: 'base64' }
    )

    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  const newTree = await githubRequest<GithubTree>(
    'POST',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/trees`,
    installationToken,
    params.replaceTree
      ? {
          tree: treeEntries,
        }
      : {
          base_tree: baseTreeSha,
          tree: treeEntries,
        }
  )

  const commit = await githubRequest<GithubCommit>(
    'POST',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/commits`,
    installationToken,
    {
      message: params.commitMessage,
      tree: newTree.sha,
      parents: [baseCommitSha],
    }
  )

  await githubRequest<GithubGitRef>(
    'PATCH',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/refs/heads/${encodeURIComponent(params.branch)}`,
    installationToken,
    { sha: commit.sha, force: false }
  )

  return { commitSha: commit.sha }
}

export async function pushPersistedProjectToGithubMain(params: {
  userId: string
  projectId: string
  installationId: number
  owner: string
  repo: string
  branch: string
  commitMessage: string
}) {
  const snapshot = await getSnapshotFromPersistedProject({
    userId: params.userId,
    projectId: params.projectId,
  })

  if (snapshot.length === 0) {
    return { commitSha: null as string | null }
  }

  return pushSnapshotToGithubMain({
    installationId: params.installationId,
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    commitMessage: params.commitMessage,
    snapshot,
    replaceTree: true,
  })
}

export async function pushProjectToGithubMain(params: {
  installationId: number
  owner: string
  repo: string
  branch: string
  commitMessage: string
  rootDir?: string
}) {
  const rootDir = params.rootDir ?? process.cwd()
  const snapshot = await getSnapshotFromFs(rootDir)

  if (snapshot.length === 0) {
    return { commitSha: null as string | null }
  }

  return pushSnapshotToGithubMain({
    installationId: params.installationId,
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    commitMessage: params.commitMessage,
    snapshot,
  })
}
