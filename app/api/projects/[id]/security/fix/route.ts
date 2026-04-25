import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { recordUsageAndDeductCredits, getUserCredits } from '@/lib/credits'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelOptions } from '@/ai/gateway'
import { getDefaultSecurityFixModelId } from '@/ai/model-routing'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import { dedupeIssues, getSandboxFiles, getSupabaseSecurityIssues, scanFilesForIssues, tryFixSupabaseIssue, type SecurityIssue } from '@/lib/security/security-utils'

interface FixRequest {
  sandboxId: string
  issues: SecurityIssue[]
}

const SECURITY_FIX_COST_CREDITS = 5

const fixResponseSchema = z.object({
  fixes: z.array(
    z.object({
      filePath: z.string().min(1),
      fixedContent: z.string(),
    })
  ),
})

function isSafeSandboxPath(filePath: string) {
  if (filePath.startsWith('/') || filePath.startsWith('\\')) return false
  if (filePath.includes('..')) return false
  return /^[a-zA-Z0-9_./-]+$/.test(filePath)
}

async function generateSecurityFixes(params: {
  modelId: string
  issues: SecurityIssue[]
  sandboxId: string
}): Promise<Map<string, string>> {
  const fixes = new Map<string, string>()

  const filePaths = Array.from(
    new Set(
      params.issues
        .map((i) => i.filePath)
        .filter((p): p is string => typeof p === 'string' && !p.startsWith('supabase_tables:'))
    )
  )

  const files = await getSandboxFiles(params.sandboxId, filePaths)

  const fileContexts = files
    .map(({ path, content }) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n')

  const issueDescriptions = params.issues
    .filter((i) => i.filePath && !i.filePath.startsWith('supabase_tables:'))
    .map(
      (issue) =>
        `- [${issue.level}] ${issue.title}${issue.filePath ? ` in ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}` : ''}`
    )
    .join('\n')

  if (!issueDescriptions || !fileContexts) {
    return fixes
  }

  const modelOptions = getModelOptions(params.modelId)

  const result = await generateObject({
    ...modelOptions,
    schema: fixResponseSchema,
    system:
      'You are a security expert AI assistant. Fix the security issues by returning complete, working, updated file contents. Do not include explanations. Only return file paths and full fixed file contents.',
    messages: [
      {
        role: 'user',
        content: `Fix these security issues:\n\n${issueDescriptions}\n\nAffected files:\n\n${fileContexts}\n\nReturn JSON that matches the schema exactly.`,
      },
    ],
  })

  for (const fix of result.object.fixes) {
    if (!isSafeSandboxPath(fix.filePath)) continue
    fixes.set(fix.filePath, fix.fixedContent)
  }

  return fixes
}

async function applyFixesToSandbox(params: { sandboxId: string; fixes: Map<string, string> }) {
  const { Sandbox } = await import('@vercel/sandbox')
  const sandbox = await Sandbox.get({ sandboxId: params.sandboxId })

  const filesToWrite: Array<{ path: string; content: Buffer }> = []

  for (const [filePath, content] of params.fixes) {
    filesToWrite.push({ path: filePath, content: Buffer.from(content, 'utf-8') })
  }

  if (filesToWrite.length > 0) {
    await sandbox.writeFiles(filesToWrite)
  }
}

const DEFAULT_SANDBOX_SCAN_PATHS = [
  'package.json',
  'app/page.tsx',
  'app/layout.tsx',
  'middleware.ts',
  'app/api/subscriptions/route.ts',
  'lib/auth.ts',
  'lib/database.ts',
]

function issueSortKey(issue: SecurityIssue) {
  return `${issue.level}:${issue.title}:${issue.filePath ?? ''}`
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
    const body = (await req.json()) as FixRequest
    const { sandboxId, issues } = body

    if (!sandboxId || !issues || issues.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check if user has enough credits
    const credits = await getUserCredits(userId)
    if (credits.balance < SECURITY_FIX_COST_CREDITS) {
      return NextResponse.json(
        {
          error: 'Insufficient credits for security fixes',
          required: SECURITY_FIX_COST_CREDITS,
          available: credits.balance,
        },
        { status: 402 }
      )
    }

    const selectedModelId = getDefaultSecurityFixModelId()

    const supabaseProject = await getSupabaseProject(userId, projectId)

    const supabaseIssues = issues.filter((i) => i.filePath?.startsWith('supabase_tables:'))
    const codeIssues = issues.filter((i) => !i.filePath?.startsWith('supabase_tables:'))

    let supabaseFixesApplied = 0
    const supabaseFixErrors: Array<{ issueId: string; error: string }> = []

    if (supabaseProject?.access_token && supabaseProject.supabase_project_ref) {
      for (const issue of supabaseIssues) {
        try {
          const res = await tryFixSupabaseIssue({
            projectRef: supabaseProject.supabase_project_ref,
            accessToken: supabaseProject.access_token,
            issue,
          })
          if (res.applied) {
            supabaseFixesApplied += 1
          } else if (res.error) {
            supabaseFixErrors.push({ issueId: issue.id, error: res.error })
          }
        } catch (error) {
          supabaseFixErrors.push({
            issueId: issue.id,
            error: error instanceof Error ? error.message : 'Failed to apply Supabase fix',
          })
        }
      }
    }

    const codeFixes = await generateSecurityFixes({
      modelId: selectedModelId,
      issues: codeIssues,
      sandboxId,
    })

    if (codeFixes.size > 0) {
      await applyFixesToSandbox({ sandboxId, fixes: codeFixes })
    }

    const anyFixApplied = codeFixes.size > 0 || supabaseFixesApplied > 0
    if (!anyFixApplied) {
      return NextResponse.json(
        {
          error: 'No fixes could be generated for the selected issues',
          fixesApplied: 0,
          supabaseFixesApplied,
          supabaseFixErrors,
        },
        { status: 422 }
      )
    }

    const deductionResult = await recordUsageAndDeductCredits({
      userId,
      modelId: selectedModelId,
      creditsRequired: SECURITY_FIX_COST_CREDITS,
      reference: projectId,
      metadata: {
        action: 'security_fix',
        issueCount: issues.length,
        codeFixesApplied: codeFixes.size,
        supabaseFixesApplied,
      },
    })

    if (!deductionResult) {
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
    }

    const files = await getSandboxFiles(sandboxId, DEFAULT_SANDBOX_SCAN_PATHS)
    const rescannedCodeIssues = scanFilesForIssues(files)

    const rescannedSupabaseIssues: SecurityIssue[] = []
    if (supabaseProject?.access_token && supabaseProject.supabase_project_ref) {
      try {
        rescannedSupabaseIssues.push(
          ...(await getSupabaseSecurityIssues({
            projectRef: supabaseProject.supabase_project_ref,
            accessToken: supabaseProject.access_token,
          }))
        )
      } catch {
        // ignore
      }
    }

    const remainingIssues = dedupeIssues([
      ...rescannedCodeIssues,
      ...rescannedSupabaseIssues,
    ]).sort((a, b) => issueSortKey(a).localeCompare(issueSortKey(b)))

    return NextResponse.json({
      success: remainingIssues.length === 0,
      creditsDeducted: deductionResult.deducted,
      creditsRemaining: deductionResult.remaining,
      fixesApplied: codeFixes.size,
      supabaseFixesApplied,
      supabaseFixErrors,
      remainingIssues,
      scannedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Security fix failed:', error)
    return NextResponse.json(
      { error: 'Security fix failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
