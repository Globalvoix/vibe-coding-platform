import path from 'node:path'
import fs from 'node:fs/promises'
import { createInstallationToken, githubRequest } from '@/lib/github-app'
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

async function getSnapshot(rootDir: string) {
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

  const items: { path: string; contentBase64: string }[] = []

  for (const rel of files) {
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

export async function pushProjectToGithubMain(params: {
  installationId: number
  owner: string
  repo: string
  branch: string
  commitMessage: string
  rootDir?: string
}) {
  const rootDir = params.rootDir ?? process.cwd()
  const installationToken = await createInstallationToken(params.installationId)

  const ref = await githubRequest<{ object: { sha: string } }>(
    'GET',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/ref/heads/${encodeURIComponent(params.branch)}`,
    installationToken
  )

  const baseCommitSha = ref.object.sha

  const baseCommit = await githubRequest<{ tree: { sha: string } }>(
    'GET',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/commits/${baseCommitSha}`,
    installationToken
  )

  const baseTreeSha = baseCommit.tree.sha

  const snapshot = await getSnapshot(rootDir)

  const treeEntries: { path: string; mode: string; type: string; sha: string }[] = []

  for (const file of snapshot) {
    const blob = await githubRequest<{ sha: string }>(
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

  const newTree = await githubRequest<{ sha: string }>(
    'POST',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/trees`,
    installationToken,
    {
      base_tree: baseTreeSha,
      tree: treeEntries,
    }
  )

  const commit = await githubRequest<{ sha: string }>(
    'POST',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/commits`,
    installationToken,
    {
      message: params.commitMessage,
      tree: newTree.sha,
      parents: [baseCommitSha],
    }
  )

  await githubRequest<any>(
    'PATCH',
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/refs/heads/${encodeURIComponent(params.branch)}`,
    installationToken,
    { sha: commit.sha, force: false }
  )

  return { commitSha: commit.sha }
}
