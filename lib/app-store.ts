import { create } from 'zustand'

export interface App {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  ownerId?: string | null
  chatMessages?: unknown[]
  files?: unknown
}

interface AppStateSnapshot {
  chatMessages?: unknown[]
  files?: unknown
}

interface AppStore {
  apps: App[]
  currentAppId: string | null
  syncStatus: 'idle' | 'loading' | 'error'
  syncError: string | null
  setApps: (apps: App[]) => void
  createApp: (name: string, description: string, ownerId?: string | null) => void
  deleteApp: (id: string) => void
  updateApp: (id: string, updates: Partial<App>) => void
  setCurrentApp: (id: string) => void
  getCurrentApp: () => App | undefined
  renameApp: (id: string, newName: string) => void
  updateAppDescription: (id: string, description: string) => void
  saveAppState: (id: string, state: AppStateSnapshot) => void
  setSyncStatus: (status: 'idle' | 'loading' | 'error') => void
  setSyncError: (error: string | null) => void
  createAppInCloud: (name: string, description: string, ownerId?: string | null) => Promise<App | null>
  deleteAppInCloud: (id: string) => Promise<boolean>
  renameAppInCloud: (id: string, newName: string) => Promise<boolean>
  updateAppInCloud: (id: string, updates: Partial<App>) => Promise<boolean>
}

export const useAppStore = create<AppStore>((set, get) => ({
  apps: [],
  currentAppId: null,
  syncStatus: 'idle',
  syncError: null,

  setApps: (apps: App[]) => {
    set((state) => {
      const mergedApps = apps.map((incoming) => {
        const existing = state.apps.find((app) => app.id === incoming.id)
        return existing ? { ...existing, ...incoming } : incoming
      })

      const currentAppId = state.currentAppId ?? (mergedApps[0]?.id ?? null)

      return {
        apps: mergedApps,
        currentAppId,
      }
    })
  },

  createApp: (name: string, description: string, ownerId?: string | null) => {
    const now = Date.now()
    const newApp: App = {
      id: now.toString(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      ownerId: ownerId ?? null,
      chatMessages: [],
      files: null,
    }

    set((state) => ({
      apps: [...state.apps, newApp],
      currentAppId: newApp.id,
    }))
  },

  deleteApp: (id: string) => {
    set((state) => {
      const newApps = state.apps.filter((app) => app.id !== id)
      const newCurrentAppId =
        state.currentAppId === id
          ? newApps.length > 0
            ? newApps[0].id
            : null
          : state.currentAppId
      return {
        apps: newApps,
        currentAppId: newCurrentAppId,
      }
    })
  },

  updateApp: (id: string, updates: Partial<App>) => {
    set((state) => ({
      apps: state.apps.map((app) =>
        app.id === id ? { ...app, ...updates, updatedAt: Date.now() } : app
      ),
    }))
  },

  setCurrentApp: (id: string) => {
    set({ currentAppId: id })
  },

  getCurrentApp: () => {
    const state = get()
    return state.apps.find((app) => app.id === state.currentAppId)
  },

  renameApp: (id: string, newName: string) => {
    get().updateApp(id, { name: newName })
  },

  updateAppDescription: (id: string, description: string) => {
    get().updateApp(id, { description })
  },

  saveAppState: (id: string, state: AppStateSnapshot) => {
    get().updateApp(id, state)
  },

  setSyncStatus: (status: 'idle' | 'loading' | 'error') => {
    set({ syncStatus: status })
  },

  setSyncError: (error: string | null) => {
    set({ syncError: error })
  },

  createAppInCloud: async (name: string, description: string, ownerId?: string | null) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = (errorData as { error?: string } | null)?.error || 'Failed to create app'
        set({ syncStatus: 'error', syncError: message })
        return null
      }

      const data = (await response.json()) as {
        app: {
          id: string
          name: string
          description: string
          createdAt: number
          updatedAt: number
        }
      }

      const apiApp = data.app

      const app: App = {
        id: apiApp.id,
        name: apiApp.name,
        description: apiApp.description ?? '',
        createdAt: apiApp.createdAt,
        updatedAt: apiApp.updatedAt,
        ownerId: ownerId ?? null,
        chatMessages: [],
        files: null,
      }

      set((state) => ({
        apps: [app, ...state.apps.filter((existing) => existing.id !== app.id)],
        currentAppId: app.id,
        syncStatus: 'idle',
        syncError: null,
      }))

      return app
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: message })
      return null
    }
  },

  deleteAppInCloud: async (id: string) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch(`/api/apps?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = (errorData as { error?: string } | null)?.error || 'Failed to delete app'
        set({ syncStatus: 'error', syncError: message })
        return false
      }

      get().deleteApp(id)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: message })
      return false
    }
  },

  renameAppInCloud: async (id: string, newName: string) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = (errorData as { error?: string } | null)?.error || 'Failed to rename app'
        set({ syncStatus: 'error', syncError: message })
        return false
      }

      get().renameApp(id, newName)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: message })
      return false
    }
  },

  updateAppInCloud: async (id: string, updates: Partial<App>) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = (errorData as { error?: string } | null)?.error || 'Failed to update app'
        set({ syncStatus: 'error', syncError: message })
        return false
      }

      get().updateApp(id, updates)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: message })
      return false
    }
  },
}))
