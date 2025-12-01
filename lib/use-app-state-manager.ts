import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/app-store'

export function useAppStateManager() {
  const { currentAppId, saveAppState, apps } = useAppStore()
  const previousAppIdRef = useRef<string | null>(null)

  useEffect(() => {
    // When switching apps, save the current app state and restore the new app state
    if (previousAppIdRef.current && previousAppIdRef.current !== currentAppId) {
      // Save the previous app's state (if needed)
      const previousApp = apps.find((a) => a.id === previousAppIdRef.current)
      if (previousApp) {
        saveAppState(previousAppIdRef.current, {
          chatMessages: previousApp.chatMessages || [],
          files: previousApp.files || [],
        })
      }
    }

    previousAppIdRef.current = currentAppId

    // When switching to a new app, we can restore its state here
    // For now, the chat component will handle displaying the app's messages
  }, [currentAppId, apps, saveAppState])

  return {
    currentAppId,
  }
}
