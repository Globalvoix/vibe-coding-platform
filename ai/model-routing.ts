import type { ModelMessage } from 'ai'
import { Models } from './constants'

export function getDefaultUiModelId() {
  return Models.GoogleGeminiFlash3
}

export function getDefaultGeneralCodingModelId() {
  return Models.GoogleGeminiFlash3
}

export function getDefaultChatContentModelId() {
  return Models.OpenAIGPT5Mini
}

export function getDefaultAdvancedCodingModelId() {
  return Models.OpenAIGPT51CodexMax
}

export function getDefaultSecurityFixModelId() {
  return Models.Minimax21
}

function extractLatestUserText(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || m.role !== 'user') continue

    const content = (m as { content?: unknown }).content
    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof (part as any).text === 'string') {
          return String((part as any).text)
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

  if (looksLikeUiWork(params.paths, latestUserText)) {
    return getDefaultUiModelId()
  }

  if (looksLikeAdvancedWork(params.paths, latestUserText)) {
    return getDefaultAdvancedCodingModelId()
  }

  return params.fallbackModelId ?? getDefaultGeneralCodingModelId()
}
