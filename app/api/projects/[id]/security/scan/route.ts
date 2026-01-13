import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { z } from 'zod'
import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import { dedupeIssues, getSupabaseSecurityIssues, scanFilesForIssues, type SecurityIssue } from '@/lib/security/security-utils'
import { runSemgrepInSandbox, type SemgrepFinding } from '@/lib/security/semgrep-sandbox'

function issueSortKey(issue: SecurityIssue) {
  return `${issue.level}:${issue.title}:${issue.filePath ?? ''}`
}

function toSecurityLevelFromSemgrep(severity: SemgrepFinding['severity']): SecurityIssue['level'] {
  if (severity === 'ERROR') return 'Error'
  return 'Warning'
}

function getSnippet(params: { content: string; line: number | null; radius?: number; maxChars?: number }) {
  const radius = typeof params.radius === 'number' ? Math.max(0, params.radius) : 3
  const maxChars = typeof params.maxChars === 'number' ? Math.max(200, params.maxChars) : 900

  if (!params.content) return ''
  const lines = params.content.split('\n')

  if (!params.line || params.line <= 0 || params.line > lines.length) {
    const raw = lines.slice(0, Math.min(lines.length, 25)).join('\n')
    return raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw
  }

  const start = Math.max(0, params.line - 1 - radius)
  const end = Math.min(lines.length, params.line + radius)
  const raw = lines.slice(start, end).join('\n')
  return raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw
}

async function readSandboxTextFile(sandbox: Awaited<ReturnType<typeof Sandbox.get>>, path: string) {
  try {
    const stream = await sandbox.readFile({ path })
    if (!stream) return null

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }

    return Buffer.concat(chunks).toString('utf-8')
  } catch {
    return null
  }
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

async function analyzeWithGptMini(params: {
  semgrep: SemgrepFinding[]
  sandboxId: string
}): Promise<SecurityIssue[]> {
  const modelId = 'openai/gpt-4.1-mini'

  const sandbox = await Sandbox.get({ sandboxId: params.sandboxId })

  const topFindings = params.semgrep.slice(0, 30)

  const fileCache = new Map<string, string>()
  const contexts = await Promise.all(
    topFindings.map(async (f) => {
      if (!f.path) return null
      if (!fileCache.has(f.path)) {
        const content = await readSandboxTextFile(sandbox, f.path)
        if (typeof content === 'string') fileCache.set(f.path, content)
      }
      const content = fileCache.get(f.path) ?? ''
      const snippet = getSnippet({ content, line: f.line })

      return {
        checkId: f.checkId,
        severity: f.severity,
        message: f.message,
        path: f.path,
        line: f.line,
        snippet,
      }
    })
  )

  const compact = contexts.filter((c): c is NonNullable<typeof c> => Boolean(c))

  const modelOptions = getModelOptions(modelId)

  const result = await generateObject({
    ...modelOptions,
    schema: gptScanSchema,
    system:
      'You are a security engineer. Use the Semgrep findings + code snippets to produce a clean, deduplicated list of actionable security issues.\n' +
      '- Do NOT invent file paths/line numbers. Use only what is provided.\n' +
      '- Prefer high-confidence issues.\n' +
      '- If two findings are the same root issue, merge them into one.\n' +
      '- Use level=Error for exploitable vulnerabilities, Warning for best-practice or lower confidence issues.',
    messages: [
      {
        role: 'user',
        content: `Semgrep findings (with snippets):\n\n${JSON.stringify(compact, null, 2)}`,
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const semgrep = await runSemgrepInSandbox({ sandboxId, timeoutSeconds: 90 })

    if (semgrep.findings.length === 0 && semgrep.stderr) {
      // Semgrep can fail due to missing python/pip in the sandbox image.
      // In that case, return a concrete error rather than a mocked scan.
      const errText = semgrep.stderr.slice(0, 800)
      return NextResponse.json(
        {
          error: 'Semgrep scan failed in the sandbox',
          details: errText,
        },
        { status: 500 }
      )
    }

    const semgrepIssues: SecurityIssue[] = semgrep.findings.map((f) => ({
      id: `semgrep:${f.checkId}:${f.path}:${f.line ?? 0}`,
      level: toSecurityLevelFromSemgrep(f.severity),
      title: f.message,
      filePath: f.path,
      lineNumber: f.line ?? undefined,
    }))

    // Keep a lightweight heuristic pass for extra coverage.
    const quickFiles = await Promise.all(
      ['package.json', 'middleware.ts', 'app/layout.tsx'].map(async (p) => ({
        path: p,
        content: (await readSandboxTextFile(sandbox, p)) ?? '',
      }))
    )

    const codeIssues = scanFilesForIssues(quickFiles.filter((f) => f.content))

    const gptIssues = await analyzeWithGptMini({ semgrep: semgrep.findings, sandboxId })

    const allIssues: SecurityIssue[] = [...semgrepIssues, ...codeIssues, ...gptIssues]

    const supabaseProject = await getSupabaseProject(userId, projectId)
    if (supabaseProject?.access_token && supabaseProject.supabase_project_ref) {
      try {
        const supabaseIssues = await getSupabaseSecurityIssues({
          projectRef: supabaseProject.supabase_project_ref,
          accessToken: supabaseProject.access_token,
        })
        allIssues.push(...supabaseIssues)
      } catch (error) {
        console.warn('Supabase security check skipped:', error instanceof Error ? error.message : undefined)
      }
    }

    const issues = dedupeIssues(allIssues).sort((a, b) => issueSortKey(a).localeCompare(issueSortKey(b)))

    return NextResponse.json({
      issues,
      filesScanned: null,
      scannedAt: new Date().toISOString(),
      semgrep: {
        findings: semgrep.findings.length,
        exitCode: semgrep.rawExitCode,
      },
    })
  } catch (error) {
    console.error('Security scan failed:', error)
    return NextResponse.json(
      { error: 'Security scan failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
