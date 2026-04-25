'use client'

import { Preview as PreviewComponent } from '@/components/preview/preview'
import { useSandboxStore } from './state'

interface Props {
  className?: string
  hideControls?: boolean
  onUrlChange?: (url: string) => void
  onInputChange?: (value: string) => void
  onLoadingChange?: (loading: boolean) => void
  onRefreshRef?: React.MutableRefObject<(() => void) | null>
  device?: 'desktop' | 'tablet' | 'mobile'
}

export function Preview({
  className,
  hideControls,
  onUrlChange,
  onInputChange,
  onLoadingChange,
  onRefreshRef,
  device,
}: Props) {
  const { status, url, isRestoringEnvironment, restoreError } = useSandboxStore()
  return (
    <PreviewComponent
      key={url}
      className={className}
      disabled={status === 'stopped'}
      url={url}
      isRestoringEnvironment={isRestoringEnvironment}
      restoreError={restoreError}
      hideControls={hideControls}
      onUrlChange={onUrlChange}
      onInputChange={onInputChange}
      onLoadingChange={onLoadingChange}
      onRefreshRef={onRefreshRef}
      device={device}
    />
  )
}
