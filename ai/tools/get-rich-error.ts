import { APIError } from '@vercel/sandbox/dist/api-client/api-error'
import { errorClassifier, type ClassifiedError } from './error-classifier'

interface Params {
  args?: Record<string, unknown>
  action: string
  error: unknown
}

interface RichErrorResponse {
  message: string
  error: {
    message: string
    json?: unknown
    text?: string
  }
  classification: ClassifiedError
  nextAction?: string
  autoFixAttempts?: string[]
}

/**
 * Determine next action based on error classification and context
 */
function getNextAction(classification: ClassifiedError, action: string, args?: Record<string, unknown>): string {
  if (classification.category === 'transient') {
    return 'System will automatically retry this operation with exponential backoff'
  }

  if (classification.category === 'recoverable') {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('install') || actionLower.includes('npm') || actionLower.includes('yarn')) {
      return 'System will attempt to resolve dependencies using package manager fallback (pnpm → yarn → npm) with compatibility flags'
    }
    if (actionLower.includes('port')) {
      return 'System will automatically select an alternate available port'
    }
    if (actionLower.includes('package') || actionLower.includes('module')) {
      return 'System will attempt to auto-install missing packages'
    }
    return 'System will attempt automated recovery based on error type'
  }

  if (classification.category === 'critical') {
    return 'This error requires manual investigation and intervention'
  }

  return 'This error may require manual review'
}

/**
 * Determine which auto-fix attempts should be made
 */
function getAutoFixAttempts(classification: ClassifiedError, action: string): string[] {
  const attempts: string[] = []

  if (classification.category === 'recoverable') {
    if (action.toLowerCase().includes('install')) {
      attempts.push('Try package manager fallback with compatibility flags')
      attempts.push('Auto-install missing packages if detected')
    }
    if (action.toLowerCase().includes('port')) {
      attempts.push('Select alternate port')
    }
    if (action.toLowerCase().includes('module')) {
      attempts.push('Auto-install missing module')
    }
  }

  if (classification.category === 'transient') {
    attempts.push('Retry with exponential backoff')
  }

  return attempts
}

/**
 * Allows to parse a thrown error to check its metadata and construct a rich
 * message that can be handed to the LLM, including error classification for
 * intelligent handling (retry, recover, fail gracefully, etc.).
 */
export function getRichError({ action, args, error }: Params): RichErrorResponse {
  const fields = getErrorFields(error)
  const classification = errorClassifier.classify(error, args)
  const nextAction = getNextAction(classification, action, args)
  const autoFixAttempts = getAutoFixAttempts(classification, action)

  let message = `Error during ${action}: ${fields.message}`

  if (classification.category === 'transient') {
    message += `\n[TRANSIENT ERROR - will retry automatically] ${classification.message}`
    message += `\nRetry Strategy: ${nextAction}`
  } else if (classification.category === 'recoverable') {
    message += `\n[RECOVERABLE ERROR] ${classification.message}`
    message += `\nNext Action: ${nextAction}`
    if (autoFixAttempts.length > 0) {
      message += `\nAuto-fix attempts:\n${autoFixAttempts.map((a) => `- ${a}`).join('\n')}`
    }
    message += `\nSuggested fixes:\n${classification.recoveryHints.map((h) => `- ${h}`).join('\n')}`
  } else if (classification.category === 'critical') {
    message += `\n[CRITICAL ERROR - manual intervention required] ${classification.message}`
    message += `\n${nextAction}`
  } else {
    message += `\n[PERMANENT ERROR] ${classification.message}`
    message += `\nSuggestions:\n${classification.recoveryHints.map((h) => `- ${h}`).join('\n')}`
  }

  if (args) message += `\nParameters: ${JSON.stringify(args, null, 2)}`
  if (fields.json) message += `\nJSON: ${JSON.stringify(fields.json, null, 2)}`
  if (fields.text) message += `\nDetails: ${fields.text}`

  return {
    message,
    error: fields,
    classification,
    nextAction,
    autoFixAttempts: autoFixAttempts.length > 0 ? autoFixAttempts : undefined,
  }
}

function getErrorFields(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
      json: error,
    }
  } else if (error instanceof APIError) {
    return {
      message: error.message,
      json: error.json,
      text: error.text,
    }
  } else {
    return {
      message: error.message,
      json: error,
    }
  }
}
