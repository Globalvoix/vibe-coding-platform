import { useState, useEffect } from 'react'

export function useLocalStorageValue(key: string, initialValue = '') {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const stored = localStorage.getItem(key)
      return stored ?? initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // localStorage not available
    }
  }, [key, value])

  return [value, setValue] as const
}