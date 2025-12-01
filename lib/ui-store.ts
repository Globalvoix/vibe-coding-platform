import { create } from 'zustand'

interface UIStore {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
}))
