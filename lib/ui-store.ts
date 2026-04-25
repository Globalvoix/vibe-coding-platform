import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  settingsModalOpen: boolean
  setSettingsModalOpen: (open: boolean) => void
  settingsTab: string
  setSettingsTab: (tab: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  settingsModalOpen: false,
  setSettingsModalOpen: (open: boolean) => set({ settingsModalOpen: open }),
  settingsTab: 'github',
  setSettingsTab: (tab: string) => set({ settingsTab: tab }),
}))
