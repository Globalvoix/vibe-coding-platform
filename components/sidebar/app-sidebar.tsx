'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { X, Home, LayoutGrid, Users } from 'lucide-react'

export function AppSidebar() {
  const [isAnimating, setIsAnimating] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isCreditsLoading, setIsCreditsLoading] = useState(false)
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()

  useEffect(() => {
    if (!isSignedIn) {
      setCreditBalance(null)
      setIsCreditsLoading(false)
      return
    }

    let cancelled = false

    async function loadCredits() {
      try {
        setIsCreditsLoading(true)
        const response = await fetch('/api/user/credits')
        if (!response.ok || cancelled) return
        const data = await response.json()
        setCreditBalance(typeof data.credits === 'number' ? data.credits : null)
      } catch (error) {
        console.error('Failed to load user credits', error)
      } finally {
        if (!cancelled) {
          setIsCreditsLoading(false)
        }
      }
    }

    loadCredits()

    return () => {
      cancelled = true
    }
  }, [isSignedIn])

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
                if (!isSignedIn) {
                  openSignIn()
                  return
                }
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

          {isSignedIn && (
            <div className="mt-auto px-4 py-3 border-t border-border/70 text-xs text-muted-foreground flex items-center justify-between">
              <span className="font-medium text-foreground/80">Credits left</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-600/10 text-green-700 border border-green-500/40">
                {isCreditsLoading ? '...' : `${creditBalance ?? 0}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
