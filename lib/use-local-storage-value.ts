import { useState } from 'react'

export function useLocalStorageValue() {
  const [value, setValue] = useState<string>('')

  return [value, setValue] as const
}
