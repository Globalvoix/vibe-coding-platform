'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

interface WorkspaceProviderProps {
  children: (projectId: string | null, promptFromUrl: string | null) => ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const promptFromUrl = searchParams.get('prompt')

  return <>{children(projectId, promptFromUrl)}</>
}
