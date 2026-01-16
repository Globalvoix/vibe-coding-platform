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
}

/**
 * Allows to parse a thrown error to check its metadata and construct a rich
 * message that can be handed to the LLM, including error classification for
 * intelligent handling (retry, recover, fail gracefully, etc.).
 */
export function getRichError({ action, args, error }: Params): RichErrorResponse {
  const fields = getErrorFields(error)
  const classification = errorClassifier.classify(error, args)

  let message = `Error during ${action}: ${fields.message}`

  if (classification.category === 'transient') {
    message += `\n[TRANSIENT ERROR - will retry automatically] ${classification.message}`
  } else if (classification.category === 'recoverable') {
    message += `\n[RECOVERABLE ERROR] ${classification.message}`
    message += `\nSuggested fixes:\n${classification.recoveryHints.map((h) => `- ${h}`).join('\n')}`
  } else if (classification.category === 'critical') {
    message += `\n[CRITICAL ERROR - manual intervention required] ${classification.message}`
  }

  if (args) message += `\nParameters: ${JSON.stringify(args, null, 2)}`
  if (fields.json) message += `\nJSON: ${JSON.stringify(fields.json, null, 2)}`
  if (fields.text) message += `\nDetails: ${fields.text}`

  return {
    message,
    error: fields,
    classification,
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
