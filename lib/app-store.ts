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

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      apps: [],
      currentAppId: null,

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
    }),
    {
      name: 'app-store',
    }
  )
)
