import type { TextUIPart } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'

export function Text({ part }: { part: TextUIPart }) {
  return (
    <div className="text-[15px] leading-relaxed text-foreground/90 font-sans">
      <MarkdownRenderer content={part.text} />
    </div>
  )
}
