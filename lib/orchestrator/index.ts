import type { UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '@/ai/messages/data-parts'
import { appendEvent } from './event-log'
import { runWithQueue } from './task-queue'
import { runHistorianAgent } from '../agents/historian'
import { runArchitectAgent } from '../agents/architect'
import { runCraftsmanAgent } from '../agents/craftsman'
import { runAdversaryAgent } from '../agents/adversary'
import { runSynthesizerAgent, buildEnhancedSystemPrompt } from '../agents/synthesizer'
import type {
  AgentRunContext,
  ExecutionPlan,
  FileDiff,
  HistorianContext,
  SynthesisResult,
} from '../agents/types'
import type { AdversaryOutput } from '../agents/adversary'

type Writer = UIMessageStreamWriter<UIMessage<never, DataPart>>

// ── Stream helpers ────────────────────────────────────────────────────────

function emitAgentStatus(
  writer: Writer,
  agentName: DataPart['agent-status']['agentName'],
  status: DataPart['agent-status']['status'],
  message?: string,
  durationMs?: number
) {
  try {
    writer.write({
      type: 'data-agent-status',
      data: { agentName, status, message, durationMs },
    } as never)
  } catch {
    // stream may be closed
  }
}

function emitSubtaskThread(
  writer: Writer,
  data: DataPart['subtask-thread']
) {
  try {
    writer.write({ type: 'data-subtask-thread', data } as never)
  } catch { /* stream may be closed */ }
}

function emitAdversaryFindings(writer: Writer, findings: DataPart['adversary-findings']) {
  try {
    writer.write({ type: 'data-adversary-findings', data: findings } as never)
  } catch { /* stream may be closed */ }
}

function emitSynthesisReady(writer: Writer, data: DataPart['synthesis-ready']) {
  try {
    writer.write({ type: 'data-synthesis-ready', data } as never)
  } catch { /* stream may be closed */ }
}

// ── Empty historian context (used when Historian hasn't finished yet) ────

const EMPTY_HISTORIAN_CONTEXT: HistorianContext = {
  relevantPastSessions: [],
  reusablePatterns: [],
  commonPitfalls: [],
  contextSummary: 'Searching history…',
}

// ── Result type ───────────────────────────────────────────────────────────

export interface OrchestratorResult {
  enhancedSystemPrompt: string
  synthesis: SynthesisResult
  plan: ExecutionPlan
  diffs: FileDiff[]
  adversaryOutput: AdversaryOutput
  historianContext: HistorianContext
}

// ── Main orchestrator ─────────────────────────────────────────────────────

export async function runOrchestrator(params: {
  ctx: AgentRunContext
  baseSystemPrompt: string
  connectorContext: string
  writer: Writer
}): Promise<OrchestratorResult> {
  const { ctx, baseSystemPrompt, connectorContext, writer } = params

  await appendEvent({
    sessionId: ctx.sessionId,
    projectId: ctx.projectId,
    userId: ctx.userId,
    eventType: 'session_start',
    data: { userPrompt: ctx.userPrompt },
  })

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 1 — TRUE PARALLEL: Historian + Architect fire simultaneously
  //
  // The Architect starts immediately with an empty Historian context.
  // Both run at the same time. If Historian finishes first, its output is
  // available when Craftsman/Adversary/Synthesizer start. If it's slower,
  // they still benefit because Historian only takes seconds (DB queries),
  // while Architect takes longer (deep planning via Claude Sonnet).
  // ════════════════════════════════════════════════════════════════════════

  emitAgentStatus(writer, 'historian', 'starting', 'Searching past sessions…')
  emitAgentStatus(writer, 'architect', 'starting', 'Planning execution…')

  const historianStartMs = Date.now()
  const architectStartMs = Date.now()

  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'historian' })
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'architect' })

  // Start both simultaneously — no await between them
  const [historianSettled, planSettled] = await Promise.allSettled([
    runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'historian',
      priority: 9,
      input: ctx,
      fn: async (input) => {
        const result = await runHistorianAgent(input)
        const ms = Date.now() - historianStartMs
        emitAgentStatus(writer, 'historian', 'done', result.contextSummary, ms)
        await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_complete', agent: 'historian', data: result })
        return result
      },
    }),
    runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'architect',
      priority: 10,
      input: { ctx, historianContext: EMPTY_HISTORIAN_CONTEXT },
      fn: async ({ ctx, historianContext }) => {
        const result = await runArchitectAgent(ctx, historianContext)
        const ms = Date.now() - architectStartMs
        emitAgentStatus(
          writer,
          'architect',
          'done',
          `Planned ${result.requiredFiles.length} files across ${result.parallelTaskGroups.length} task group(s)`,
          ms
        )
        await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'plan_produced', agent: 'architect', data: result })
        return result
      },
    }),
  ])

  // Resolve Historian result
  let historianContext: HistorianContext = EMPTY_HISTORIAN_CONTEXT
  if (historianSettled.status === 'fulfilled') {
    historianContext = historianSettled.value
  } else {
    console.warn('[orchestrator] Historian failed:', historianSettled.reason)
    historianContext = {
      relevantPastSessions: [],
      reusablePatterns: [],
      commonPitfalls: [],
      contextSummary: 'No historical context available.',
    }
    emitAgentStatus(writer, 'historian', 'error', 'No historical context available')
  }

  // Resolve Architect result (required — throw if it failed)
  if (planSettled.status === 'rejected') {
    const message = planSettled.reason instanceof Error ? planSettled.reason.message : 'Architect failed'
    emitAgentStatus(writer, 'architect', 'error', message)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_error', agent: 'architect', data: { error: message } })
    throw new Error(`[orchestrator] Architect agent failed: ${message}`)
  }
  const plan = planSettled.value

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 2 — PARALLEL SUBTASK THREADS + ADVERSARY
  //
  // Each parallel task group in the plan gets its own Craftsman instance.
  // Groups with canRunInParallelWithOtherGroups:true run in parallel threads.
  // All Craftsman threads run alongside the Adversary simultaneously.
  // ════════════════════════════════════════════════════════════════════════

  const parallelGroups = plan.parallelTaskGroups.filter((g) => g.canRunInParallelWithOtherGroups)
  const sequentialGroups = plan.parallelTaskGroups.filter((g) => !g.canRunInParallelWithOtherGroups)

  // If there are parallel groups, emit subtask thread events
  const hasParallelWork = parallelGroups.length > 1
  if (hasParallelWork) {
    for (const group of parallelGroups) {
      const groupFiles = group.tasks.flatMap((t) => t.files)
      emitSubtaskThread(writer, {
        threadId: group.groupId,
        groupId: group.groupId,
        description: group.description,
        status: 'starting',
        filesHandled: groupFiles,
      })
    }
  }

  emitAgentStatus(writer, 'craftsman', 'starting', hasParallelWork ? `Spawning ${parallelGroups.length} parallel threads…` : 'Writing file diffs…')
  emitAgentStatus(writer, 'adversary', 'starting', 'Attacking the plan…')

  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'craftsman' })
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'adversary' })

  const craftsmanStartMs = Date.now()
  const adversaryStartMs = Date.now()

  // Build Craftsman tasks: one per parallel group + one for all sequential groups combined
  const craftsmanTasks: Array<{
    groupId: string
    description: string
    fileHints: string[]
  }> = []

  // Parallel groups each get their own Craftsman thread
  for (const group of parallelGroups) {
    craftsmanTasks.push({
      groupId: group.groupId,
      description: group.description,
      fileHints: group.tasks.flatMap((t) => t.files),
    })
  }

  // Sequential groups consolidated into one Craftsman
  if (sequentialGroups.length > 0) {
    craftsmanTasks.push({
      groupId: 'sequential',
      description: 'Sequential tasks',
      fileHints: sequentialGroups.flatMap((g) => g.tasks.flatMap((t) => t.files)),
    })
  }

  // Fallback: if no groups, run a single Craftsman for all files
  if (craftsmanTasks.length === 0) {
    craftsmanTasks.push({
      groupId: 'main',
      description: 'Main implementation',
      fileHints: plan.requiredFiles.map((f) => f.path),
    })
  }

  // Run all Craftsman threads + Adversary in parallel
  const craftsmanPromises = craftsmanTasks.map((task) =>
    runWithQueue({
      sessionId: ctx.sessionId,
      taskType: `craftsman-${task.groupId}`,
      priority: 8,
      input: { ctx, plan, fileHints: task.fileHints },
      fn: async ({ ctx, plan, fileHints }) => {
        if (hasParallelWork && task.groupId !== 'sequential' && task.groupId !== 'main') {
          emitSubtaskThread(writer, {
            threadId: task.groupId,
            groupId: task.groupId,
            description: task.description,
            status: 'running',
            filesHandled: fileHints,
          })
        }
        const diffs = await runCraftsmanAgent(ctx, plan, fileHints)
        if (hasParallelWork && task.groupId !== 'sequential' && task.groupId !== 'main') {
          emitSubtaskThread(writer, {
            threadId: task.groupId,
            groupId: task.groupId,
            description: task.description,
            status: 'done',
            filesHandled: diffs.map((d) => d.path),
          })
        }
        return diffs
      },
    })
  )

  const adversaryPromise = runWithQueue({
    sessionId: ctx.sessionId,
    taskType: 'adversary',
    priority: 8,
    input: { ctx, plan },
    fn: ({ ctx, plan }) => runAdversaryAgent(ctx, plan, []),
  })

  const allPhase2 = await Promise.allSettled([
    Promise.all(craftsmanPromises),
    adversaryPromise,
  ])

  const craftsmanAllSettled = allPhase2[0]
  const adversarySettled = allPhase2[1]

  // Merge all Craftsman diffs
  let diffs: FileDiff[] = []
  if (craftsmanAllSettled.status === 'fulfilled') {
    diffs = craftsmanAllSettled.value.flat()
    const ms = Date.now() - craftsmanStartMs
    emitAgentStatus(writer, 'craftsman', 'done', `Produced ${diffs.length} file diffs${hasParallelWork ? ` across ${craftsmanTasks.length} parallel threads` : ''}`, ms)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'diffs_produced', agent: 'craftsman', data: { count: diffs.length, threads: craftsmanTasks.length } })
  } else {
    console.warn('[orchestrator] Craftsman failed:', craftsmanAllSettled.reason)
    emitAgentStatus(writer, 'craftsman', 'error', 'Craftsman encountered an error — proceeding with plan only')
  }

  // Adversary result
  let adversaryOutput: AdversaryOutput = {
    problems: [],
    overallRisk: 'low',
    riskSummary: 'No adversary analysis available.',
    safeToProceed: true,
  }
  if (adversarySettled.status === 'fulfilled') {
    adversaryOutput = adversarySettled.value
    const criticalCount = adversaryOutput.problems.filter((p) => p.severity === 'critical').length
    const majorCount = adversaryOutput.problems.filter((p) => p.severity === 'major').length
    const ms = Date.now() - adversaryStartMs
    emitAgentStatus(
      writer,
      'adversary',
      'done',
      `Found ${adversaryOutput.problems.length} issue(s) — ${criticalCount} critical, ${majorCount} major. Risk: ${adversaryOutput.overallRisk}`,
      ms
    )
    emitAdversaryFindings(writer, {
      problems: adversaryOutput.problems.map((p) => ({
        severity: p.severity,
        category: p.category,
        description: p.description,
        affectedFiles: p.affectedFiles,
        suggestion: p.suggestion,
      })),
      overallRisk: adversaryOutput.overallRisk,
      riskSummary: adversaryOutput.riskSummary,
    })
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'problems_found', agent: 'adversary', data: adversaryOutput })
  } else {
    console.warn('[orchestrator] Adversary failed:', adversarySettled.reason)
    emitAgentStatus(writer, 'adversary', 'error', 'Adversary analysis skipped')
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3 — SYNTHESIZER: Reconcile all outputs into execution directive
  // ════════════════════════════════════════════════════════════════════════

  emitAgentStatus(writer, 'synthesizer', 'starting', 'Synthesizing final execution directive…')
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'synthesizer' })
  const synthStartMs = Date.now()

  let synthesis: SynthesisResult
  try {
    synthesis = await runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'synthesizer',
      priority: 7,
      input: { ctx, plan, diffs, adversaryOutput, historianContext },
      fn: ({ ctx, plan, diffs, adversaryOutput, historianContext }) =>
        runSynthesizerAgent(ctx, plan, diffs, adversaryOutput, historianContext),
    })
    const ms = Date.now() - synthStartMs
    emitAgentStatus(
      writer,
      'synthesizer',
      'done',
      `${synthesis.criticalProblems.length} critical issue(s) patched, ${synthesis.warnings.length} warning(s) surfaced`,
      ms
    )
    emitSynthesisReady(writer, {
      criticalProblemsPatched: synthesis.criticalProblems.length,
      warningsCount: synthesis.warnings.length,
      filesPlanned: plan.requiredFiles.length,
      executionDirectiveReady: true,
    })
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'synthesis_complete', agent: 'synthesizer', data: { criticalCount: synthesis.criticalProblems.length, warnCount: synthesis.warnings.length } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Synthesizer failed'
    console.warn('[orchestrator] Synthesizer failed — falling back to base prompt:', err)
    emitAgentStatus(writer, 'synthesizer', 'error', 'Synthesis failed — using base directive')

    synthesis = {
      enhancedPlan: plan,
      criticalProblems: [],
      warnings: [],
      patchedDiffs: diffs,
      executionDirective: `Build the following: ${ctx.userPrompt}. Plan: ${plan.intent}. Files: ${plan.requiredFiles.map((f) => f.path).join(', ')}.`,
      qualityGating: {
        mustPassBeforeExecution: [],
        mustPassAfterExecution: ['App runs without errors'],
      },
    }
  }

  const enhancedSystemPrompt = buildEnhancedSystemPrompt(
    baseSystemPrompt,
    synthesis,
    connectorContext
  )

  await appendEvent({
    sessionId: ctx.sessionId,
    projectId: ctx.projectId,
    userId: ctx.userId,
    eventType: 'execution_start',
    data: { filesPlanned: plan.requiredFiles.length, complexity: plan.estimatedComplexity },
  })

  return { enhancedSystemPrompt, synthesis, plan, diffs, adversaryOutput, historianContext }
}
