'use client'

import { Loader2Icon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { DEFAULT_MODEL } from '@/ai/constants'
import { useAvailableModels } from './use-available-models'
import { useModelId } from './use-settings'

export function ModelSelector({ className }: { className?: string }) {
  const [modelId, setModelId] = useModelId()
  const { models: available, isLoading, error } = useAvailableModels()
  const models = useMemo(
    () => available?.sort((a, b) => a.label.localeCompare(b.label)) || [],
    [available]
  )

  useEffect(() => {
    if (isLoading || !models.length) return

    const selected = models.find((m) => m.id === modelId)
    if (selected && selected.enabled) return

    const fallback = models.find((m) => m.enabled)?.id ?? DEFAULT_MODEL
    if (fallback !== modelId) {
      setModelId(fallback)
      if (selected?.requiresPaid) {
        toast.error('Upgrade your plan to use Claude Sonnet 4.5.')
      }
    }
  }, [DEFAULT_MODEL, isLoading, modelId, models, setModelId])

  return (
    <Select
      value={modelId}
      onValueChange={setModelId}
      disabled={isLoading || !!error || !models?.length}
    >
      <SelectTrigger
        className={cn(
          'h-7 rounded-full border-none bg-transparent px-1.5 text-xs font-mono shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
          className
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-1.5">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          </div>
        ) : error ? (
          <span className="text-red-500">Error</span>
        ) : !models?.length ? (
          <span>No models</span>
        ) : (
          <SelectValue placeholder="Select a model" />
        )}
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          <SelectLabel>Models</SelectLabel>
          {models.map((model) => (
            <SelectItem
              key={model.id}
              value={model.id}
              disabled={!model.enabled}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span>{model.label}</span>
                {model.requiresPaid && !model.enabled ? (
                  <span className="text-[10px] uppercase text-muted-foreground">
                    Paid
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
