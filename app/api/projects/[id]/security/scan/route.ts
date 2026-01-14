import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import {
  dedupeIssues,
  getSupabaseSecurityIssues,
  scanFilesForIssues,
  type SecurityIssue,
} from '@/lib/security/security-utils'
import { getGithubSecurityIssuesForProject } from '@/lib/security/github-security'

function issueSortKey(issue: SecurityIssue) {
  return `${issue.level}:${issue.title}:${issue.filePath ?? ''}`
}

type SandboxCmdResult = {
  exitCode: number | null
  stdout: string
  stderr: string
}

async function runSandboxBash(
  sandbox: Awaited<ReturnType<typeof Sandbox.get>>,
  script: string
): Promise<SandboxCmdResult> {
  const cmd = await sandbox.runCommand({
    cmd: 'bash',
    args: ['-lc', script],
  })

  const done = await cmd.wait().catch(() => null)
  const exitCode = done?.exitCode ?? null

  const [stdout, stderr] = await Promise.all([
    done?.stdout().catch(() => '') ?? Promise.resolve(''),
    done?.stderr().catch(() => '') ?? Promise.resolve(''),
  ])

  return { exitCode, stdout, stderr }
}

function isLikelyTextFile(path: string) {
  const lower = path.toLowerCase()
  if (lower.endsWith('dockerfile')) return true
  if (lower.endsWith('.gitignore')) return true
  if (lower.endsWith('.npmrc')) return true
  if (lower.endsWith('.env')) return true
  if (lower.endsWith('.env.local')) return true
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|sass|less|yaml|yml|toml|sql)$/i.test(path)
}

async function listSandboxFilePaths(params: {
  sandbox: Awaited<ReturnType<typeof Sandbox.get>>
  maxPaths?: number
}): Promise<string[]> {
  const maxPaths =
    typeof params.maxPaths === 'number' && params.maxPaths > 0 ? Math.min(5000, params.maxPaths) : 2000

  const find = [
    'set -e',
    'cd .',
    [
      'find .',
      "\\( -type d -name node_modules -o -type d -name .next -o -type d -name dist -o -type d -name build -o -type d -name coverage -o -type d -name .vercel \\)",
      '-prune',
      '-o -type f -print',
      `| sed 's|^\\./||'`,
      `| head -n ${maxPaths}`,
    ].join(' '),
  ].join('\n')

  const { exitCode, stdout, stderr } = await runSandboxBash(params.sandbox, find)
  if (exitCode !== 0) {
    const details = stderr.trim() ? `: ${stderr.trim().slice(0, 800)}` : ''
    throw new Error(`Failed to list files in sandbox${details}`)
  }

  return stdout
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
}

async function readSandboxTextFile(params: {
  sandbox: Awaited<ReturnType<typeof Sandbox.get>>
  path: string
  maxChars?: number
}): Promise<string | null> {
  try {
    const stream = await params.sandbox.readFile({ path: params.path })
    if (!stream) return null

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }

    const raw = Buffer.concat(chunks).toString('utf-8')
    if (!raw) return ''
    if (raw.includes('\u0000')) return null

    const maxChars = typeof params.maxChars === 'number' && params.maxChars > 0 ? params.maxChars : 250_000
    return raw.length > maxChars ? raw.slice(0, maxChars) : raw
  } catch {
    return null
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const projectId = params.id

    const body = (await req.json()) as { sandboxId?: string }
    const sandboxId = body.sandboxId

    if (!sandboxId) {
      return NextResponse.json({ error: 'Missing sandboxId' }, { status: 400 })
    }

    const sandbox = await Sandbox.get({ sandboxId })

    const allPaths = await listSandboxFilePaths({ sandbox })
    const codePaths = allPaths.filter(isLikelyTextFile)

    const maxFilesToRead = 600
    const selectedPaths = codePaths.slice(0, maxFilesToRead)

    const fileReads = await Promise.all(
      selectedPaths.map(async (path) => ({
        path,
        content: (await readSandboxTextFile({ sandbox, path })) ?? null,
      }))
    )

    const oversizedSkippedIssues: SecurityIssue[] = []

    const readableFiles = fileReads
      .filter((f) => typeof f.content === 'string')
      .map((f) => {
        const content = f.content as string
        if (content.length >= 250_000) {
          oversizedSkippedIssues.push({
            id: `scan:truncated-large-file:${f.path}`,
            level: 'Warning',
            title: 'Large file truncated by security scan (size limit)',
            filePath: f.path,
          })
        }
        return { path: f.path, content }
      })

    const codeIssues = scanFilesForIssues(readableFiles)

    const allIssues: SecurityIssue[] = [...codeIssues, ...oversizedSkippedIssues]

    const supabaseProject = await getSupabaseProject(userId, projectId)
    if (supabaseProject?.access_token && supabaseProject.supabase_project_ref) {
      try {
        const supabaseIssues = await getSupabaseSecurityIssues({
          projectRef: supabaseProject.supabase_project_ref,
          accessToken: supabaseProject.access_token,
        })
        allIssues.push(...supabaseIssues)
      } catch (error) {
        allIssues.push({
          id: `supabase:scan-failed:${supabaseProject.supabase_project_ref}`,
          level: 'Warning',
          title:
            'Supabase security scan failed' +
            (error instanceof Error && error.message ? `: ${error.message.slice(0, 300)}` : ''),
          filePath: `supabase_project:${supabaseProject.supabase_project_ref}`,
        })
      }
    }

    try {
      const githubIssues = await getGithubSecurityIssuesForProject({ userId, projectId })
      allIssues.push(...githubIssues)
    } catch (error) {
      allIssues.push({
        id: `github:scan-failed:${projectId}`,
        level: 'Warning',
        title: 'GitHub security scan failed' + (error instanceof Error ? `: ${error.message.slice(0, 300)}` : ''),
        filePath: 'github',
      })
    }

    const issues = dedupeIssues(allIssues).sort((a, b) => issueSortKey(a).localeCompare(issueSortKey(b)))

    return NextResponse.json({
      issues,
      filesScanned: readableFiles.length,
      scannedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Security scan failed:', error)
    return NextResponse.json(
      { error: 'Security scan failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
