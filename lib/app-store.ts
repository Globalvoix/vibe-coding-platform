import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  setApps: (apps: App[]) => void
  createApp: (name: string, description: string, ownerId?: string | null) => void
  deleteApp: (id: string) => void
  updateApp: (id: string, updates: Partial<App>) => void
  setCurrentApp: (id: string) => void
  getCurrentApp: () => App | undefined
  renameApp: (id: string, newName: string) => void
  updateAppDescription: (id: string, description: string) => void
  saveAppState: (id: string, state: AppStateSnapshot) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  apps: [],
  currentAppId: null,
  syncStatus: 'idle',
  syncError: null,

  setApps: (apps: App[]) => {
    set({
      apps,
      currentAppId: apps.length > 0 ? apps[0].id : null,
    })
  },

  createApp: (name: string, description: string, ownerId?: string | null) => {
    const newApp: App = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

  syncDeleteApp: async (id: string) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch(`/api/apps?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        set({ syncStatus: 'error', syncError: error.error || 'Failed to delete app' })
        return false
      }

      get().deleteApp(id)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: errorMessage })
      return false
    }
  },

  syncRenameApp: async (id: string, newName: string) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      })

      if (!response.ok) {
        const error = await response.json()
        set({ syncStatus: 'error', syncError: error.error || 'Failed to rename app' })
        return false
      }

      get().renameApp(id, newName)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: errorMessage })
      return false
    }
  },

  syncUpdateApp: async (id: string, updates: Partial<App>) => {
    set({ syncStatus: 'loading', syncError: null })
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const error = await response.json()
        set({ syncStatus: 'error', syncError: error.error || 'Failed to update app' })
        return false
      }

      get().updateApp(id, updates)
      set({ syncStatus: 'idle', syncError: null })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      set({ syncStatus: 'error', syncError: errorMessage })
      return false
    }
  },
}))
