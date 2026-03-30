import type { UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '@/ai/messages/data-parts'
import { appendEvent } from './event-log'
import { runWithQueue } from './task-queue'
import { runHistorianAgent } from '../agents/historian'
import { runArchitectAgent } from '../agents/architect'
import { runCraftsmanAgent } from '../agents/craftsman'
import { runAdversaryAgent } from '../agents/adversary'
import { runSynthesizerAgent, buildEnhancedSystemPrompt } from '../agents/synthesizer'
import type { AgentRunContext, ExecutionPlan, FileDiff, HistorianContext, SynthesisResult } from '../agents/types'
import type { AdversaryOutput } from '../agents/adversary'

type Writer = UIMessageStreamWriter<UIMessage<never, DataPart>>

function emitAgentStatus(
  writer: Writer,
  agentName: DataPart['agent-status']['agentName'],
  status: DataPart['agent-status']['status'],
  message?: string
) {
  try {
    writer.write({
      type: 'data-agent-status',
      data: { agentName, status, message },
    } as never)
  } catch {
    // stream may be closed
  }
}

function emitAdversaryFindings(writer: Writer, findings: DataPart['adversary-findings']) {
  try {
    writer.write({
      type: 'data-adversary-findings',
      data: findings,
    } as never)
  } catch {
    // stream may be closed
  }
}

function emitSynthesisReady(writer: Writer, data: DataPart['synthesis-ready']) {
  try {
    writer.write({
      type: 'data-synthesis-ready',
      data,
    } as never)
  } catch {
    // stream may be closed
  }
}

export interface OrchestratorResult {
  enhancedSystemPrompt: string
  synthesis: SynthesisResult
  plan: ExecutionPlan
  diffs: FileDiff[]
  adversaryOutput: AdversaryOutput
  historianContext: HistorianContext
}

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

  // ──────────────────────────────────────────
  // Step 1: Historian — runs first, in parallel with nothing
  // ──────────────────────────────────────────
  emitAgentStatus(writer, 'historian', 'starting', 'Searching past sessions…')
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'historian' })

  let historianContext: HistorianContext
  try {
    historianContext = await runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'historian',
      priority: 9,
      input: ctx,
      fn: (input) => runHistorianAgent(input),
    })
    emitAgentStatus(writer, 'historian', 'done', historianContext.contextSummary)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_complete', agent: 'historian', data: historianContext })
  } catch (err) {
    console.warn('[orchestrator] Historian failed:', err)
    historianContext = {
      relevantPastSessions: [],
      reusablePatterns: [],
      commonPitfalls: [],
      contextSummary: 'No historical context available.',
    }
    emitAgentStatus(writer, 'historian', 'error', 'No historical context available')
  }

  // ──────────────────────────────────────────
  // Step 2: Architect — produces the plan
  // ──────────────────────────────────────────
  emitAgentStatus(writer, 'architect', 'starting', 'Planning execution…')
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'architect' })

  let plan: ExecutionPlan
  try {
    plan = await runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'architect',
      priority: 10,
      input: { ctx, historianContext },
      fn: ({ ctx, historianContext }) => runArchitectAgent(ctx, historianContext),
    })
    emitAgentStatus(writer, 'architect', 'done', `Planned ${plan.requiredFiles.length} files across ${plan.parallelTaskGroups.length} task group(s)`)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'plan_produced', agent: 'architect', data: plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Architect failed'
    emitAgentStatus(writer, 'architect', 'error', message)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_error', agent: 'architect', data: { error: message } })
    throw new Error(`[orchestrator] Architect agent failed: ${message}`)
  }

  // ──────────────────────────────────────────
  // Step 3: Craftsman + Adversary run in PARALLEL
  // ──────────────────────────────────────────
  emitAgentStatus(writer, 'craftsman', 'starting', 'Writing file diffs…')
  emitAgentStatus(writer, 'adversary', 'starting', 'Attacking the plan…')

  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'craftsman' })
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'adversary' })

  const [craftsmanResult, adversaryResult] = await Promise.allSettled([
    runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'craftsman',
      priority: 8,
      input: { ctx, plan },
      fn: ({ ctx, plan }) => runCraftsmanAgent(ctx, plan),
    }),
    runWithQueue({
      sessionId: ctx.sessionId,
      taskType: 'adversary',
      priority: 8,
      input: { ctx, plan, diffs: [] as FileDiff[] },
      fn: ({ ctx, plan }) => runAdversaryAgent(ctx, plan, []),
    }),
  ])

  let diffs: FileDiff[] = []
  if (craftsmanResult.status === 'fulfilled') {
    diffs = craftsmanResult.value
    emitAgentStatus(writer, 'craftsman', 'done', `Produced ${diffs.length} file diffs`)
    await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'diffs_produced', agent: 'craftsman', data: { count: diffs.length } })
  } else {
    console.warn('[orchestrator] Craftsman failed:', craftsmanResult.reason)
    emitAgentStatus(writer, 'craftsman', 'error', 'Craftsman encountered an error — proceeding with plan only')
  }

  let adversaryOutput: AdversaryOutput = {
    problems: [],
    overallRisk: 'low',
    riskSummary: 'No adversary analysis available.',
    safeToProceed: true,
  }
  if (adversaryResult.status === 'fulfilled') {
    adversaryOutput = adversaryResult.value
    const criticalCount = adversaryOutput.problems.filter((p) => p.severity === 'critical').length
    const majorCount = adversaryOutput.problems.filter((p) => p.severity === 'major').length
    emitAgentStatus(
      writer,
      'adversary',
      'done',
      `Found ${adversaryOutput.problems.length} issue(s) — ${criticalCount} critical, ${majorCount} major. Risk: ${adversaryOutput.overallRisk}`
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
    console.warn('[orchestrator] Adversary failed:', adversaryResult.reason)
    emitAgentStatus(writer, 'adversary', 'error', 'Adversary analysis skipped')
  }

  // ──────────────────────────────────────────
  // Step 4: Synthesizer — reconcile everything
  // ──────────────────────────────────────────
  emitAgentStatus(writer, 'synthesizer', 'starting', 'Synthesizing final execution directive…')
  await appendEvent({ sessionId: ctx.sessionId, projectId: ctx.projectId, userId: ctx.userId, eventType: 'agent_start', agent: 'synthesizer' })

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
    emitAgentStatus(
      writer,
      'synthesizer',
      'done',
      `${synthesis.criticalProblems.length} critical issue(s) patched, ${synthesis.warnings.length} warning(s) surfaced`
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
