import { resultSchema, type Line, type Lines } from './schemas'

const FALLBACK_RESULT = {
  shouldBeFixed: false,
  summary: '',
  paths: [],
}

export async function getSummary(lines: Line[], previous: Line[]) {
  try {
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lines, previous } satisfies Lines),
    })

    if (!response.ok) {
      return FALLBACK_RESULT
    }

    const body = await response.json()
    const parsed = resultSchema.safeParse(body)
    return parsed.success ? parsed.data : FALLBACK_RESULT
  } catch {
    return FALLBACK_RESULT
  }
}
