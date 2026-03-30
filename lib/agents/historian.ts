import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { DEFAULT_MODEL } from '@/ai/constants'
import { getPastPlanEvents, getPastSessionSummaries } from '../orchestrator/event-log'
import { historianContextSchema, type AgentRunContext, type HistorianContext } from './types'

const HISTORIAN_SYSTEM_PROMPT = `You are the Historian agent in a multi-agent AI system.

Your sole job is to analyze a user's current request against their past sessions and extract:
1. Relevant patterns they have used before that could help now
2. Common mistakes or pitfalls seen in their history
3. Reusable architectural patterns that apply

You have access to summaries of the user's past generation sessions. Be concise and specific.
Focus on what is genuinely useful for the current request — do not pad your response.
If there is no relevant history, say so clearly with an empty arrays and a short contextSummary.`

export async function runHistorianAgent(
  ctx: AgentRunContext
): Promise<HistorianContext> {
  const [pastSessions, pastPlans] = await Promise.all([
    getPastSessionSummaries(ctx.userId, 8).catch(() => []),
    getPastPlanEvents(ctx.userId, 5).catch(() => []),
  ])

  if (pastSessions.length === 0 && pastPlans.length === 0) {
    return {
      relevantPastSessions: [],
      reusablePatterns: [],
      commonPitfalls: [],
      contextSummary: 'No past sessions found for this user.',
    }
  }

  const historyText = [
    pastSessions.length > 0
      ? `Past session completions:\n${pastSessions
          .map((s, i) => `${i + 1}. Session ${s.sessionId.slice(0, 8)} — ${JSON.stringify(s.data).slice(0, 200)}`)
          .join('\n')}`
      : '',
    pastPlans.length > 0
      ? `Past execution plans:\n${pastPlans
          .map((p, i) => `${i + 1}. ${JSON.stringify(p.data).slice(0, 300)}`)
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const modelOptions = getModelOptions(DEFAULT_MODEL)
    const result = await generateObject({
      ...modelOptions,
      schema: historianContextSchema,
      system: HISTORIAN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current user request: "${ctx.userPrompt}"

User's past history:
${historyText}

Extract relevant context, patterns, and pitfalls for the current request.`,
        },
      ],
    })
    return result.object
  } catch (err) {
    console.warn('[historian] Failed to generate context:', err)
    return {
      relevantPastSessions: [],
      reusablePatterns: [],
      commonPitfalls: [],
      contextSummary: 'Historian agent encountered an error. Proceeding without historical context.',
    }
  }
}
