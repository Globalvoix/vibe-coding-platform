'use client'

import * as React from 'react'
import {
  ChevronDown,
  Settings as SettingsIcon,
  Pencil,
  Star,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth } from '@clerk/nextjs'
import { CREDITS_UPDATED_EVENT } from '@/lib/credits-events'

import { RenameProjectModal } from './rename-project-modal'

interface ProjectDropdownProps {
  projectName: string
  projectId?: string | null
}

const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="url(#heart-gradient)" />
    <defs>
      <linearGradient id="heart-gradient" x1="2" y1="3" x2="22" y2="21.35" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF4D4D" />
        <stop offset="0.5" stopColor="#F9CB28" />
        <stop offset="1" stopColor="#7B61FF" />
      </linearGradient>
    </defs>
  </svg>
)

export function ProjectDropdown({ projectName, projectId }: ProjectDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [renameModalOpen, setRenameModalOpen] = React.useState(false)
  const [creditBalance, setCreditBalance] = React.useState<number | null>(null)
  const [isCreditsLoading, setIsCreditsLoading] = React.useState(false)
  const router = useRouter()
  const { isSignedIn } = useAuth()

  const loadCredits = React.useCallback(async () => {
    if (!isSignedIn) return
    try {
      setIsCreditsLoading(true)
      const response = await fetch('/api/user/credits')
      if (response.ok) {
        const data = await response.json()
        setCreditBalance(typeof data.credits === 'number' ? data.credits : null)
      }
    } catch (error) {
      console.error('Failed to load credits', error)
    } finally {
      setIsCreditsLoading(false)
    }
  }, [isSignedIn])

  React.useEffect(() => {
    loadCredits()
    window.addEventListener(CREDITS_UPDATED_EVENT, loadCredits)
    return () => window.removeEventListener(CREDITS_UPDATED_EVENT, loadCredits)
  }, [loadCredits])

  const maxCredits = 100 // Assuming 100 is max for progress bar display
  const creditPercentage = creditBalance !== null ? Math.min((creditBalance / maxCredits) * 100, 100) : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-black/[0.03] rounded-md transition-colors group">
          <HeartIcon />
          <span className="text-[13px] font-semibold text-foreground/85 truncate max-w-[180px]">
            {projectName || 'Untitled Project'}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-foreground/30 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1 rounded-xl shadow-xl border border-black/[0.06] bg-[#F7F4ED] mt-1.5 animate-in fade-in zoom-in-95 duration-200 transition-all">
        <div className="flex flex-col">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] rounded-lg transition-colors group"
          >
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
            <span className="font-medium">Go to Dashboard</span>
          </button>

          <div className="mt-2 mb-1 px-3">
            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">My workspace</span>
          </div>

          <div className="px-3.5 py-3 bg-[#EFECE0] rounded-sm border border-black/[0.03] mx-1 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-foreground/80">Credits</span>
              <div className="flex items-center gap-1 text-[12px] font-medium text-foreground/45">
                <span>{isCreditsLoading ? '...' : (creditBalance ?? 0).toLocaleString()} left</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-black/[0.08] rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-[#1A73E8] transition-all duration-700 rounded-full"
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#1A73E8]" />
              <span className="text-[11px] text-foreground/45 font-medium">Daily credits used first</span>
            </div>
          </div>

          <div className="h-px bg-black/[0.05] my-1 mx-1" />

          <div className="flex flex-col py-0.5">
            <button className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] rounded-lg transition-colors group">
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-4 h-4 opacity-70" />
                <span className="font-medium">Settings</span>
              </div>
              <span className="text-[10px] text-foreground/30 font-semibold group-hover:text-foreground/40 transition-colors">Ctrl .</span>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                setRenameModalOpen(true)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4 opacity-70" />
              <span className="font-medium">Rename project</span>
            </button>

            <button className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] rounded-lg transition-colors">
              <Star className="w-4 h-4 opacity-70" />
              <span className="font-medium">Star project</span>
            </button>
          </div>
        </div>
      </PopoverContent>

      {projectId && (
        <RenameProjectModal
          isOpen={renameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          currentName={projectName}
          projectId={projectId}
        />
      )}
    </Popover>
  )
}
