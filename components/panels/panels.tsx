import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  children: ReactNode
}

export function Panel({ className, children }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col relative w-full h-full rounded-sm border border-primary/18 bg-background/80 shadow-md backdrop-blur-lg transition-shadow duration-300',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({ className, children }: Props) {
  return (
    <div
      className={cn(
        'text-sm flex items-center border-b border-primary/18 px-2.5 py-1.5 text-secondary-foreground bg-secondary/95 backdrop-blur-sm shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
