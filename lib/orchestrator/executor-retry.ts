import type { UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '@/ai/messages/data-parts'
import { generateText } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { getDebuggingModelId } from '@/ai/model-routing'
import { appendEvent } from './event-log'
import { Sandbox } from 'e2b'

type Writer = UIMessageStreamWriter<UIMessage<never, DataPart>>

const MAX_RETRY_ATTEMPTS = 3

const DEBUGGER_SYSTEM_PROMPT = `You are a debugging agent in a multi-agent AI system.

You receive a stack trace or error output from a sandbox execution and must:
1. Identify the root cause precisely
2. Produce the minimal code fix needed to resolve the error

Rules:
- Be surgical: change only what is broken
- Output ONLY the fixed file content for each affected file
- Use this exact format for each file:
  FILE: <path>
  \`\`\`
  <complete fixed file content>
  \`\`\`
- If no fix is possible, output: UNFIXABLE: <reason>
- Do not add explanations — only the fix`

export interface ExecutorRetryParams {
  sandboxId: string
  command: string
  args: string[]
  sessionId: string
  projectId: string
  userId: string
  writer: Writer
}

export interface ExecutorRetryResult {
  success: boolean
  attempts: number
  exitCode: number | null
  finalOutput: string
  errorMessage: string | null
}

function emitRetryEvent(
  writer: Writer,
  attempt: number,
  reason: string,
  fixApplied?: string
) {
  try {
    writer.write({
      type: 'data-execution-retry',
      data: {
        attempt,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        reason,
        fixApplied,
      },
    } as never)
  } catch { /* stream closed */ }
}

/**
 * Run a command in the E2B sandbox with automatic error detection and fix.
 * Retries up to MAX_RETRY_ATTEMPTS times before surfacing the error to the user.
 */
export async function runWithRetry(params: ExecutorRetryParams): Promise<ExecutorRetryResult> {
  const { sandboxId, command, args, sessionId, projectId, userId, writer } = params

  let sandbox: Sandbox
  try {
    sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cannot connect to sandbox'
    return { success: false, attempts: 0, exitCode: null, finalOutput: '', errorMessage: msg }
  }

  let lastOutput = ''
  let lastExitCode: number | null = null

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    // Run the command
    const fullCommand = [command, ...args].join(' ')
    let stdout = ''
    let stderr = ''

    try {
      const proc = await sandbox.commands.run(fullCommand, {
        timeoutMs: 120_000,
        onStdout: (data) => { stdout += data },
        onStderr: (data) => { stderr += data },
      })
      lastExitCode = proc.exitCode ?? null
      lastOutput = stdout + stderr
    } catch (err) {
      lastOutput = err instanceof Error ? err.message : String(err)
      lastExitCode = 1
    }

    // Success?
    if (lastExitCode === 0) {
      await appendEvent({
        sessionId,
        projectId,
        userId,
        eventType: 'execution_success',
        data: { attempt, command: fullCommand },
      })
      return {
        success: true,
        attempts: attempt,
        exitCode: 0,
        finalOutput: lastOutput,
        errorMessage: null,
      }
    }

    // On failure (and not the last attempt), try to auto-fix
    if (attempt < MAX_RETRY_ATTEMPTS) {
      emitRetryEvent(writer, attempt, `Exit code ${lastExitCode}: ${lastOutput.slice(0, 200)}`)

      await appendEvent({
        sessionId,
        projectId,
        userId,
        eventType: 'execution_error',
        data: { attempt, exitCode: lastExitCode, error: lastOutput.slice(0, 500) },
      })

      // Ask the debugging model to analyze and fix
      const fixApplied = await attemptAutoFix(sandbox, lastOutput, attempt, sessionId, projectId, userId)

      if (fixApplied) {
        emitRetryEvent(writer, attempt, `Retrying after auto-fix (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`, fixApplied)
      }

      // Small delay before retry
      await new Promise((r) => setTimeout(r, 1000))
      continue
    }

    // All attempts exhausted
    emitRetryEvent(writer, attempt, `All ${MAX_RETRY_ATTEMPTS} attempts failed: ${lastOutput.slice(0, 200)}`)
    await appendEvent({
      sessionId,
      projectId,
      userId,
      eventType: 'execution_failed',
      data: { attempts: attempt, exitCode: lastExitCode, error: lastOutput.slice(0, 500) },
    })
  }

  return {
    success: false,
    attempts: MAX_RETRY_ATTEMPTS,
    exitCode: lastExitCode,
    finalOutput: lastOutput,
    errorMessage: `Execution failed after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${lastOutput.slice(0, 400)}`,
  }
}

/**
 * Use the debugging model to analyze an error and attempt to write a fix
 * directly to the sandbox.
 */
async function attemptAutoFix(
  sandbox: Sandbox,
  errorOutput: string,
  attempt: number,
  sessionId: string,
  projectId: string,
  userId: string
): Promise<string | null> {
  try {
    const modelOptions = getModelOptions(getDebuggingModelId())
    const { text } = await generateText({
      ...modelOptions,
      system: DEBUGGER_SYSTEM_PROMPT,
      prompt: `Error output (attempt ${attempt}):\n\n${errorOutput.slice(0, 3000)}\n\nAnalyze the root cause and produce the minimal fix.`,
    })

    if (!text || text.startsWith('UNFIXABLE:')) {
      return null
    }

    // Parse and apply file fixes
    const fileBlockRegex = /FILE:\s*(.+?)\n```[\w]*\n([\s\S]*?)```/g
    const fixes: Array<{ path: string; content: string }> = []
    let match: RegExpExecArray | null

    while ((match = fileBlockRegex.exec(text)) !== null) {
      const path = (match[1] ?? '').trim()
      const content = match[2] ?? ''
      if (path && content) {
        fixes.push({ path, content })
      }
    }

    if (fixes.length === 0) return null

    // Write fixes to sandbox
    for (const fix of fixes) {
      await sandbox.files.write(fix.path, fix.content)
    }

    await appendEvent({
      sessionId,
      projectId,
      userId,
      eventType: 'auto_fix_applied',
      data: { attempt, fixedFiles: fixes.map((f) => f.path) },
    })

    return `Fixed ${fixes.length} file(s): ${fixes.map((f) => f.path).join(', ')}`
  } catch (err) {
    console.warn('[executor-retry] Auto-fix failed:', err)
    return null
  }
}
