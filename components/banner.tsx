'use client'

import { XIcon } from 'lucide-react'
import { useState } from 'react'

interface Props {
  defaultOpen: boolean
  onDismiss: () => void
}

export function Banner({ defaultOpen, onDismiss }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  if (!open) {
    return null
  }

  return (
    <div className="relative full text-xs border border-dashed border-blue-500 bg-blue-100 py-2 pl-2 pr-8">
      <strong>Welcome to Thinksoft</strong> An AI-powered full-stack development platform that transforms your ideas into production-ready applications. Build with the latest AI models, advanced features like database integration, real-time backends, and deployment support—all through natural language prompts.
      <button
        aria-label="Close Banner"
        className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900 transition-colors cursor-pointer"
        onClick={() => {
          onDismiss()
          setOpen(false)
        }}
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
