import type { DataPart } from '@/ai/messages/data-parts'
import { CheckIcon, ExternalLinkIcon, GlobeIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

export function GetSandboxURL({
  message,
}: {
  message: DataPart['get-sandbox-url']
}) {
  const isDone = !!message.url && message.status !== 'loading'

  return (
    <ToolMessage>
      <div className="flex items-center justify-between">
        <ToolHeader className="mb-0">
          <GlobeIcon className="w-3.5 h-3.5" />
          <span>
            {message.status === 'loading' ? 'Publishing app...' : 'App published'}
          </span>
        </ToolHeader>
        <div className="flex items-center gap-2">
          {message.status === 'loading' ? (
            <Spinner loading={true} className="w-3.5 h-3.5" />
          ) : (
            <CheckIcon className="w-3.5 h-3.5 text-green-500/70" />
          )}
        </div>
      </div>

      {isDone && message.url && (
        <div className="mt-3">
          <a
            href={message.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-3 bg-[#E8F0FE] hover:bg-[#DEE7F8] border border-[#1A73E8] rounded-xl transition-all group shadow-sm"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#1A73E8]/70 uppercase tracking-wider">Live Preview</span>
              <span className="text-[14px] font-semibold text-[#0F172A] truncate">{message.url.replace(/^https?:\/\//, '')}</span>
            </div>
            <ExternalLinkIcon className="w-4 h-4 text-[#0F172A]/40 group-hover:text-[#1A73E8] transition-colors shrink-0" />
          </a>
        </div>
      )}
    </ToolMessage>
  )
}
