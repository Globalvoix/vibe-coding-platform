import { useState } from 'react'

export function useLocalStorageValue(key: string) {
  const [value, setValue] = useState<string>('')

  return [value, setValue] as const
}
