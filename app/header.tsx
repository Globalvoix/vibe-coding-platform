"use client"

import { ThinksoftLogo } from '@/components/icons/thinksoft'
import { Menu } from 'lucide-react'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Header({ className }: Props) {
  const { toggleSidebar } = useUIStore()

  return (
    <header className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
          title="Toggle app menu"
          aria-label="Toggle app menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <ThinksoftLogo className="h-6 w-20 ml-1 md:ml-2.5 mr-1.5" />
      </div>
    </header>
  )
}
