'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { X, Home, LayoutGrid, Users } from 'lucide-react'

export function AppSidebar() {
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  const handleNavigateHome = () => {
    setSidebarOpen(false)
    router.push('/home')
  }

  const handleToggle = () => {
    setIsAnimating(true)
    setSidebarOpen(false)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <>
      <div
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-background/60 border-r border-border/70 z-30 transform transition-transform duration-300 overflow-y-auto backdrop-blur-md backdrop-saturate-150 shadow-lg',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isAnimating && 'pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-4 border-b border-border/70 sticky top-0 bg-transparent">
            <button
              onClick={handleToggle}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 border-b border-border space-y-1">
            <button
              onClick={handleNavigateHome}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              type="button"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => {
                setSidebarOpen(false)
                router.push('/projects')
              }}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors"
              type="button"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>All projects</span>
            </button>
            <button
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors"
              type="button"
            >
              <Users className="w-4 h-4" />
              <span>Shared with me</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
