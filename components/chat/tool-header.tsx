import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ToolHeader(props: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-foreground/60 mb-1 font-medium',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
