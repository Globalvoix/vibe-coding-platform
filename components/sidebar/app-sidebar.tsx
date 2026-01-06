'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useUIStore } from '@/lib/ui-store'
import { CREDITS_UPDATED_EVENT } from '@/lib/credits-events'
import { cn } from '@/lib/utils'
import { X, Home, LayoutGrid, Users, Settings, Github } from 'lucide-react'
import { GithubIcon } from '@/components/icons/github'

export function AppSidebar() {
  const [isAnimating, setIsAnimating] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isCreditsLoading, setIsCreditsLoading] = useState(false)
  const [resetText, setResetText] = useState<string | null>(null)
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen, setSettingsModalOpen, setSettingsTab } = useUIStore()
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()

  const handleOpenSettings = (tab: string = 'settings') => {
    setSettingsTab(tab)
    setSettingsModalOpen(true)
    setSidebarOpen(false)
  }

  useEffect(() => {
    if (!isSignedIn) {
      setCreditBalance(null)
      setIsCreditsLoading(false)
      setResetText(null)
      return
    }

    let cancelled = false

    async function loadSubscriptionAndCredits() {
      try {
        setIsCreditsLoading(true)

        const [subscriptionResponse, creditsResponse] = await Promise.all([
          fetch('/api/user/subscription'),
          fetch('/api/user/credits'),
        ])

        if (cancelled) return

        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json()
          setCreditBalance(
            typeof creditsData.credits === 'number' ? creditsData.credits : null
          )
        }

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          const subscription = subscriptionData.subscription

          if (subscription) {
            const rawEnd: string | null = subscription.current_period_end
            let resetDate: Date | null = null

            if (rawEnd) {
              resetDate = new Date(rawEnd)
            } else {
              const now = new Date()
              resetDate = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                now.getDate(),
                now.getHours(),
                now.getMinutes()
              )
            }

            if (!Number.isNaN(resetDate.getTime())) {
              const datePart = resetDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
              const timePart = resetDate.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })
              setResetText(`Resets on ${datePart} at ${timePart}`)
            } else {
              setResetText(null)
            }
          } else {
            setResetText(null)
          }
        }
      } catch (error) {
        console.error('Failed to load subscription or credits', error)
      } finally {
        if (!cancelled) {
          setIsCreditsLoading(false)
        }
      }
    }

    loadSubscriptionAndCredits()

    window.addEventListener(CREDITS_UPDATED_EVENT, loadSubscriptionAndCredits)

    return () => {
      cancelled = true
      window.removeEventListener(CREDITS_UPDATED_EVENT, loadSubscriptionAndCredits)
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
          'fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 z-[100] transform transition-transform duration-300 overflow-y-auto shadow-2xl',
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
            <button
              onClick={() => handleOpenSettings('settings')}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors"
              type="button"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          <div className="p-4 border-b border-border space-y-1">
            <h4 className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Connectors
            </h4>
            <button
              onClick={() => handleOpenSettings('github')}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors"
              type="button"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </button>
          </div>

          {isSignedIn && (
            <div className="mt-auto px-4 py-3 border-t border-border/70 text-xs text-muted-foreground flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground/80">Credits left</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-600/10 text-green-700 border border-green-500/40">
                  {isCreditsLoading ? '...' : `${creditBalance ?? 0}`}
                </span>
              </div>
              {resetText && (
                <span className="text-[11px] text-muted-foreground/80">
                  {resetText}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
