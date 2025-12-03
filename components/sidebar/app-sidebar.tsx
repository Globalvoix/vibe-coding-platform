'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { X, Home } from 'lucide-react'

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
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20"
          onClick={handleToggle}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-background/60 border-r border-border/70 z-30 transform transition-transform duration-300 overflow-y-auto backdrop-blur-md backdrop-saturate-150 shadow-lg',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isAnimating && 'pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-tight">
              Thinksoft
            </h2>
            <button
              onClick={handleToggle}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 border-b border-border">
            <button
              onClick={handleNavigateHome}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
