"use client"

import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

type PromptInputContextType = {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: '',
  setValue: () => {},
  maxHeight: 160,
  onSubmit: undefined,
  disabled: false,
})

function usePromptInput() {
  const context = useContext(PromptInputContext)
  if (!context) {
    throw new Error('usePromptInput must be used within a PromptInput')
  }
  return context
}

type PromptInputProps = {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 160,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || '')

  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TooltipProvider>
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: value ?? internalValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          onSubmit,
          disabled,
        }}
      >
        <div
          className={cn(
            'border-black/[0.03] rounded-lg border px-2.5 py-1.5 shadow-sm transition-all focus-within:shadow-md focus-within:border-black/[0.05] bg-[#F7F4ED]',
            className
          )}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    </TooltipProvider>
  )
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>

function PromptInputTextarea({
  className,
  onKeyDown,
  onChange,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  useLayoutEffect(() => {
    if (!textareaRef.current) return

    if (!disableAutosize) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        typeof maxHeight === 'number'
          ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
          : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`
    }

    const selection = selectionRef.current
    if (!selection) return
    selectionRef.current = null

    if (document.activeElement !== textareaRef.current) return

    try {
      textareaRef.current.setSelectionRange(selection.start, selection.end)
    } catch {
      // ignore
    }
  }, [value, maxHeight, disableAutosize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    selectionRef.current = {
      start: e.target.selectionStart ?? e.target.value.length,
      end: e.target.selectionEnd ?? e.target.value.length,
    }
    setValue(e.target.value)
    onChange?.(e)
  }

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(
        'text-sm min-h-[32px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
        className
      )}
      rows={1}
      disabled={disabled}
      {...props}
    />
  )
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} {...props}>
      {children}
    </div>
  )
}

type PromptInputActionProps = {
  className?: string
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
} & React.ComponentProps<typeof Tooltip>

function PromptInputAction({
  tooltip,
  children,
  className,
  side = 'top',
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput()

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
}
