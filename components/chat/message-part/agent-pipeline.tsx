'use client'

import { useSandboxStore, type AgentState, type AgentName } from '@/app/state'
import { cn } from '@/lib/utils'
import { CheckCircle2Icon, XCircleIcon, Loader2Icon, ClockIcon, GitBranchIcon } from 'lucide-react'
import { memo } from 'react'

const AGENT_LABELS: Record<AgentName, string> = {
  historian: 'Historian',
  architect: 'Architect',
  craftsman: 'Craftsman',
  adversary: 'Adversary',
  synthesizer: 'Synthesizer',
  executor: 'Executor',
}

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  historian: 'Queries past sessions for patterns',
  architect: 'Produces structured execution plan',
  craftsman: 'Writes file diffs for each file',
  adversary: 'Attacks the plan for issues',
  synthesizer: 'Reconciles all outputs',
  executor: 'Writes code to sandbox',
}

function AgentStatusIcon({ status }: { status: AgentState['status'] }) {
  if (status === 'done') return <CheckCircle2Icon className="w-3.5 h-3.5 text-green-500 shrink-0" />
  if (status === 'error') return <XCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
  if (status === 'starting' || status === 'running') return <Loader2Icon className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" />
  return <ClockIcon className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
}

function AgentRow({ agent }: { agent: AgentState }) {
  const isActive = agent.status === 'starting' || agent.status === 'running'
  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'
  const isIdle = agent.status === 'idle'

  return (
    <div className={cn(
      'flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg transition-colors',
      isActive && 'bg-blue-50/60',
      isDone && 'bg-transparent',
      isError && 'bg-red-50/60',
    )}>
      <div className="mt-0.5">
        <AgentStatusIcon status={agent.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[12px] font-semibold',
            isIdle && 'text-foreground/30',
            isActive && 'text-blue-700',
            isDone && 'text-foreground/80',
            isError && 'text-red-700',
          )}>
            {AGENT_LABELS[agent.name]}
          </span>
          {agent.durationMs && isDone && (
            <span className="text-[10px] text-foreground/35 font-medium">
              {(agent.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {agent.message && !isIdle && (
          <p className={cn(
            'text-[11px] mt-0.5 leading-[1.4] truncate',
            isError ? 'text-red-600' : 'text-foreground/50',
          )}>
            {agent.message}
          </p>
        )}
        {isIdle && (
          <p className="text-[11px] mt-0.5 text-foreground/25 truncate">
            {AGENT_DESCRIPTIONS[agent.name]}
          </p>
        )}
      </div>
    </div>
  )
}

const PIPELINE_AGENTS: AgentName[] = ['historian', 'architect', 'craftsman', 'adversary', 'synthesizer']

interface Props {
  agentName: AgentName
}

export const AgentPipeline = memo(function AgentPipeline({ agentName }: Props) {
  const { agents, subtaskThreads } = useSandboxStore()

  const anyActive = PIPELINE_AGENTS.some(
    (n) => agents[n].status === 'starting' || agents[n].status === 'running'
  )
  const anyStarted = PIPELINE_AGENTS.some((n) => agents[n].status !== 'idle')

  if (!anyStarted) return null

  const activeAgent = agents[agentName]
  const isActive = activeAgent.status === 'starting' || activeAgent.status === 'running'
  const isDone = activeAgent.status === 'done'

  // Inline compact view when rendering a single agent's status in the message stream
  return (
    <div className="flex items-center gap-2 text-[12px] py-0.5">
      <AgentStatusIcon status={activeAgent.status} />
      <span className={cn(
        'font-semibold',
        isActive && 'text-blue-700',
        isDone && 'text-foreground/70',
        activeAgent.status === 'error' && 'text-red-600',
        activeAgent.status === 'idle' && 'text-foreground/30',
      )}>
        {AGENT_LABELS[agentName]}
      </span>
      {activeAgent.message && (
        <span className="text-foreground/50 truncate max-w-[280px]">{activeAgent.message}</span>
      )}
      {activeAgent.durationMs && isDone && (
        <span className="text-foreground/30 text-[10px]">{(activeAgent.durationMs / 1000).toFixed(1)}s</span>
      )}
      {subtaskThreads.length > 1 && (agentName === 'craftsman') && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
          <GitBranchIcon className="w-2.5 h-2.5" />
          {subtaskThreads.length} threads
        </span>
      )}
    </div>
  )
})

export const AgentPipelinePanel = memo(function AgentPipelinePanel() {
  const { agents, subtaskThreads } = useSandboxStore()
  const anyStarted = PIPELINE_AGENTS.some((n) => agents[n].status !== 'idle')
  if (!anyStarted) return null

  const allDone = PIPELINE_AGENTS.every((n) => agents[n].status === 'done' || agents[n].status === 'error')
  const hasParallelThreads = subtaskThreads.length > 1

  return (
    <div className="rounded-xl border border-black/[0.07] bg-white shadow-sm overflow-hidden w-full max-w-[420px]">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            allDone ? 'bg-green-500' : 'bg-blue-500 animate-pulse',
          )} />
          <span className="text-[12px] font-semibold text-foreground/80">
            {allDone ? 'Multi-agent pipeline complete' : 'Multi-agent pipeline running…'}
          </span>
        </div>
      </div>

      <div className="p-1.5 space-y-0.5">
        {PIPELINE_AGENTS.map((name) => (
          <AgentRow key={name} agent={agents[name]} />
        ))}
      </div>

      {hasParallelThreads && (
        <div className="px-3 py-2.5 border-t border-black/[0.05] bg-[#F8F9FF]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranchIcon className="w-3 h-3 text-blue-500" />
            <span className="text-[11px] font-semibold text-blue-700">Parallel subtask threads</span>
          </div>
          <div className="space-y-1">
            {subtaskThreads.map((thread) => (
              <div key={thread.threadId} className="flex items-center gap-2 text-[11px]">
                <div className={cn(
                  'w-1 h-1 rounded-full',
                  thread.status === 'done' ? 'bg-green-500' :
                  thread.status === 'error' ? 'bg-red-500' :
                  thread.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                )} />
                <span className="text-foreground/60 truncate max-w-[280px]">{thread.description}</span>
                <span className="text-foreground/35 shrink-0">{thread.filesHandled.length} files</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
