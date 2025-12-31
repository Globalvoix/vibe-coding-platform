import type { DataPart } from '@/ai/messages/data-parts'

export function ExtractDesign({ message }: { message: DataPart['extract-design'] }) {
  if (message.status === 'searching') {
    return (
      <div className="text-xs text-foreground/60">
        Finding design references…
      </div>
    )
  }

  if (message.status === 'extracting') {
    return (
      <div className="text-xs text-foreground/60">
        Extracting code patterns…
      </div>
    )
  }

  return null
}
