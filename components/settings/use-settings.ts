import { parseAsBoolean, useQueryState } from 'nuqs'

export function useSettings() {
  const [fixErrors] = useFixErrors()
  return { fixErrors }
}

export function useFixErrors() {
  return useQueryState('fix-errors', parseAsBoolean.withDefault(true))
}
