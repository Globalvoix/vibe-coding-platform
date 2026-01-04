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
    <ToolMessage className="bg-red-500/[0.03] border-red-500/10 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <BugIcon className="w-3.5 h-3.5 text-red-600/70" />
        <span className="text-[13px] font-medium text-red-600/75">Auto-detected errors</span>
      </div>
      <div className="text-[13px] text-foreground/75 leading-[1.6] font-sans pl-5">
        <MarkdownRenderer content={message.summary} />
      </div>
    </ToolMessage>
  )
}
