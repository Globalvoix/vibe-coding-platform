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
import { memo, useEffect } from 'react'
import { toast } from 'sonner'
import { DEFAULT_MODEL } from '@/ai/constants'
import { useAvailableModels } from './use-available-models'

interface Props {
  modelId: string
  onModelChange: (modelId: string) => void
}

export const ModelSelector = memo(function ModelSelector({
  modelId,
  onModelChange,
}: Props) {
  const { models, isLoading, error } = useAvailableModels()

  useEffect(() => {
    if (isLoading || !!error || !models?.length) return

    const selected = models.find((m) => m.id === modelId)
    if (selected && selected.enabled) return

    const fallback = models.find((m) => m.enabled)?.id ?? DEFAULT_MODEL
    if (fallback !== modelId) {
      onModelChange(fallback)
      if (selected?.requiresPaid) {
        toast.error('Upgrade your plan to use Claude Sonnet 4.5.')
      }
    }
  }, [DEFAULT_MODEL, error, isLoading, modelId, models, onModelChange])
  return (
    <Select
      value={modelId}
      onValueChange={onModelChange}
      disabled={isLoading || !!error || !models?.length}
    >
      <SelectTrigger className="w-[180px] bg-background">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <span>Loading</span>
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
          {models
            ?.sort((a, b) => a.label.localeCompare(b.label))
            .map((model) => (
              <SelectItem key={model.id} value={model.id} disabled={!model.enabled}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span>{model.label}</span>
                  {model.requiresPaid && !model.enabled ? (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Paid
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            )) || []}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
})
