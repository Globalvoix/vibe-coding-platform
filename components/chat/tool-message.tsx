import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ToolMessage(props: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'text-[13px] py-0.5 text-foreground/65 font-sans',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
