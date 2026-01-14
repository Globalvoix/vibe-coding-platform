import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { z } from 'zod'
import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
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

function rankPathForSecurity(path: string) {
  if (path === 'package.json') return 0
  if (path === 'middleware.ts' || path === 'middleware.js') return 1
  if (path.startsWith('app/api/')) return 2
  if (path.includes('/api/')) return 3
  if (path.startsWith('lib/')) return 4
  if (path.startsWith('supabase/')) return 5
  if (path.startsWith('app/')) return 6
  return 10
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

function withLineNumbers(content: string, maxLines: number) {
  const lines = content.split('\n').slice(0, maxLines)
  return lines.map((line, idx) => `${String(idx + 1).padStart(4, ' ')}| ${line}`).join('\n')
}

const gptScanSchema = z.object({
  issues: z.array(
    z.object({
      id: z.string().min(1),
      level: z.enum(['Error', 'Warning']),
      title: z.string().min(1),
      filePath: z.string().optional(),
      lineNumber: z.number().int().positive().optional(),
    })
  ),
})

async function analyzeSecurityWithGptMini(params: {
  files: Array<{ path: string; content: string }>
}): Promise<SecurityIssue[]> {
  const modelId = 'openai/gpt-4.1-mini'
  const modelOptions = getModelOptions(modelId)

  const maxFiles = 18
  const maxLinesPerFile = 180

  const ranked = [...params.files]
    .sort((a, b) => rankPathForSecurity(a.path) - rankPathForSecurity(b.path) || a.path.localeCompare(b.path))
    .slice(0, maxFiles)
    .map((f) => ({
      path: f.path,
      content: withLineNumbers(f.content, maxLinesPerFile),
    }))

  const result = await generateObject({
    ...modelOptions,
    schema: gptScanSchema,
    system:
      'You are a senior application security engineer reviewing a Next.js/TypeScript project.' +
      '\nReturn a list of real, actionable security issues found in the provided file excerpts.' +
      '\nRules:' +
      '\n- Use only the provided file paths.' +
      "\n- If you provide a lineNumber, it must match the numbered lines in the excerpt (the format is \'  12| ...\')." +
      '\n- Do NOT invent issues; prefer high-confidence findings.' +
      '\n- Focus on auth, data access, injection, SSRF, insecure secrets, missing validation, unsafe redirects, and webhooks.' +
      '\n- Deduplicate similar issues.' +
      '\n- Keep titles short and specific.',
    messages: [
      {
        role: 'user',
        content: `Analyze these files:\n\n${JSON.stringify(ranked, null, 2)}`,
      },
    ],
  })

  return result.object.issues.map((i) => ({
    id: i.id,
    level: i.level,
    title: i.title,
    filePath: i.filePath,
    lineNumber: i.lineNumber,
  }))
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

    const maxFilesToRead = 700
    const rankedPaths = [...codePaths].sort(
      (a, b) => rankPathForSecurity(a) - rankPathForSecurity(b) || a.localeCompare(b)
    )
    const selectedPaths = rankedPaths.slice(0, maxFilesToRead)

    const fileReads = await Promise.all(
      selectedPaths.map(async (path) => ({
        path,
        content: (await readSandboxTextFile({ sandbox, path })) ?? null,
      }))
    )

    const oversizedTruncatedIssues: SecurityIssue[] = []

    const readableFiles = fileReads
      .filter((f) => typeof f.content === 'string')
      .map((f) => {
        const content = f.content as string
        if (content.length >= 250_000) {
          oversizedTruncatedIssues.push({
            id: `scan:truncated-large-file:${f.path}`,
            level: 'Warning',
            title: 'Large file truncated by security scan (size limit)',
            filePath: f.path,
          })
        }
        return { path: f.path, content }
      })

    const heuristicIssues = scanFilesForIssues(readableFiles)

    const allIssues: SecurityIssue[] = [...heuristicIssues, ...oversizedTruncatedIssues]

    try {
      const aiIssues = await analyzeSecurityWithGptMini({ files: readableFiles })
      allIssues.push(...aiIssues)
    } catch (error) {
      allIssues.push({
        id: `ai-security-analysis-failed:${projectId}`,
        level: 'Warning',
        title:
          'AI security analysis failed' + (error instanceof Error && error.message ? `: ${error.message.slice(0, 240)}` : ''),
        filePath: 'ai',
      })
    }

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
