import type { DataPart } from '@/ai/messages/data-parts'
import { BugIcon } from 'lucide-react'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'

export function ReportErrors({
  message,
}: {
  message: DataPart['report-errors']
}) {
  return (
    <ToolMessage className="bg-red-500/[0.02] border-red-500/10 rounded-xl px-4 py-3">
      <ToolHeader className="text-red-600/80">
        <BugIcon className="w-3.5 h-3.5" />
        <span>Auto-detected errors</span>
      </ToolHeader>
      <div className="text-[13px] text-foreground/80 leading-relaxed font-sans">
        <MarkdownRenderer content={message.summary} />
      </div>
    </ToolMessage>
  )
}
