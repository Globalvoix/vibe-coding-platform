'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { X, FolderPlus } from 'lucide-react'

export function AppSidebar() {
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isWorkspacePage = pathname === '/workspace'
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
          'fixed left-0 top-0 h-screen w-64 bg-background border-r border-border z-30 transform transition-transform duration-300 overflow-y-auto',
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

          <div className="p-4 border-b border-border space-y-2">
            <p className="text-xs text-muted-foreground">
              App management has been disabled for this demo. You can still use the
              workspace and AI features normally.
            </p>
          </div>

          {!isWorkspacePage && (
            <div className="p-4 border-b border-border">
              <button
                onClick={handleNavigateHome}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Open workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
