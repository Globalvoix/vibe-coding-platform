import type { TextUIPart } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'

export function Text({ part }: { part: TextUIPart }) {
  return (
    <div className="text-sm leading-relaxed px-3.5 py-3 rounded-2xl border border-border/70 bg-background/95 text-foreground shadow-xs font-mono">
      <MarkdownRenderer content={part.text} />
    </div>
  )
}
