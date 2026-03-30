import type { ModelMessage } from 'ai'
import { Models } from './constants'

// ── Agent-specific model selectors ──────────────────────────────────────────

/** Architect, Adversary, Synthesizer: Claude Sonnet 4.5 for deep reasoning & planning */
export function getAgentPlanningModelId() {
  return Models.AnthropicClaude45Sonnet
}

/** Historian: Gemini Flash — fast retrieval/pattern matching */
export function getHistorianModelId() {
  return Models.GoogleGeminiFlash3
}

/** Craftsman: Gemini Flash for UI files, Claude Sonnet for backend/lib files */
export function getCraftsmanModelId(fileHints: string[]): string {
  const hasBackend = fileHints.some(
    (p) =>
      p.startsWith('lib/') ||
      p.startsWith('server/') ||
      p.startsWith('api/') ||
      p.startsWith('app/api/') ||
      p.includes('route.ts') ||
      p.includes('.ts') && !p.endsWith('.tsx')
  )
  return hasBackend ? Models.AnthropicClaude45Sonnet : Models.GoogleGeminiFlash3
}

/** Debugging / auto-retry error analysis: GPT-5.1 Codex Max */
export function getDebuggingModelId() {
  return Models.OpenAIGPT51CodexMax
}

/** UI file generation: Gemini Flash */
export function getDefaultUiModelId() {
  return Models.GoogleGeminiFlash3
}

/** General coding: Gemini Flash */
export function getDefaultGeneralCodingModelId() {
  return Models.GoogleGeminiFlash3
}

/** Chat/content: GPT-5 Mini */
export function getDefaultChatContentModelId() {
  return Models.OpenAIGPT5Mini
}

/** Advanced / complex backend: Claude Sonnet 4.5 */
export function getDefaultAdvancedCodingModelId() {
  return Models.AnthropicClaude45Sonnet
}

/** Security fix: Minimax (unchanged) */
export function getDefaultSecurityFixModelId() {
  return Models.Minimax21
}

// ── File-type-aware model chooser ──────────────────────────────────────────

function extractLatestUserText(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || m.role !== 'user') continue

    const content = (m as { content?: unknown }).content
    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return String((part as { text: string }).text)
        }
      }
    }
  }

  return ''
}

function looksLikeUiWork(paths: string[], latestUserText: string) {
  const uiPathHit = paths.some((p) =>
    /^app\/.+\/page\.(t|j)sx?$/.test(p) ||
    /^app\/.+\/layout\.(t|j)sx?$/.test(p) ||
    p.startsWith('components/') ||
    p.startsWith('app/') ||
    p.endsWith('.css') ||
    p.endsWith('.scss') ||
    p.endsWith('.sass') ||
    p.endsWith('.less')
  )

  if (uiPathHit) return true

  return /(ui|ux|design|layout|styles?|tailwind|css|component|button|modal|page|navbar|sidebar)/i.test(latestUserText)
}

function looksLikeAdvancedWork(paths: string[], latestUserText: string) {
  const advancedTextHit =
    /(architecture|refactor|optimi[sz]e|performance|scalab|multi-tenant|websocket|realtime|streaming|oauth|sso|encryption|migration|database schema|queue|cache|rate limit)/i.test(
      latestUserText
    )

  const advancedPathHit = paths.some((p) => p.startsWith('lib/') || p.startsWith('server/') || p.startsWith('supabase/'))

  return advancedTextHit || advancedPathHit
}

export function chooseFileGenerationModelId(params: {
  paths: string[]
  messages: ModelMessage[]
  fallbackModelId?: string
}): string {
  const latestUserText = extractLatestUserText(params.messages)

  // UI work → Gemini Flash 3 (best visual quality, fastest)
  if (looksLikeUiWork(params.paths, latestUserText)) {
    return getDefaultUiModelId()
  }

  // Advanced/backend work → Claude Sonnet 4.5 (best reasoning)
  if (looksLikeAdvancedWork(params.paths, latestUserText)) {
    return getDefaultAdvancedCodingModelId()
  }

  // Default → Gemini Flash
  return params.fallbackModelId ?? getDefaultGeneralCodingModelId()
}

export function selectOptimalModelsForGeneration(paths: string[]): {
  uiModel: string
  backendModel: string
  debugModel: string
  defaultModel: string
} {
  return {
    uiModel: getDefaultUiModelId(),          // Gemini Flash 3
    backendModel: getDefaultAdvancedCodingModelId(), // Claude Sonnet 4.5
    debugModel: getDebuggingModelId(),        // GPT-5.1 Codex Max
    defaultModel: getDefaultGeneralCodingModelId(), // Gemini Flash 3
  }
}
