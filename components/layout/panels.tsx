'use client'

import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { HORIZONTAL_COOKIE, VERTICAL_COOKIE } from './sizing'

interface HProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultLayout: number[]
}

export function Horizontal({ defaultLayout, left, right }: HProps) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `${HORIZONTAL_COOKIE}=${JSON.stringify(sizes)}`
  }
  return (
    <PanelGroup direction="horizontal" onLayout={onLayout}>
      <Panel defaultSize={defaultLayout[0]}>{left}</Panel>
      <PanelResizeHandle className="group relative w-3 -mx-1 flex items-center justify-center cursor-col-resize select-none">
        <div className="h-full w-px bg-border/60 group-hover:bg-border transition-colors" />
        <div className="absolute rounded-full border border-border/60 bg-background shadow-sm px-1 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-2 rounded-full bg-border/70" />
            <div className="h-0.5 w-2 rounded-full bg-border/70" />
            <div className="h-0.5 w-2 rounded-full bg-border/70" />
          </div>
        </div>
      </PanelResizeHandle>
      <Panel defaultSize={defaultLayout[1]}>{right}</Panel>
    </PanelGroup>
  )
}

interface VProps {
  defaultLayout: number[]
  top: React.ReactNode
  middle: React.ReactNode
  bottom: React.ReactNode
}

export function Vertical({ defaultLayout, top, middle, bottom }: VProps) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `${VERTICAL_COOKIE}=${JSON.stringify(sizes)}`
  }
  return (
    <PanelGroup direction="vertical" onLayout={onLayout}>
      <Panel defaultSize={defaultLayout[0]}>{top}</Panel>
      <PanelResizeHandle className="h-2" />
      <Panel defaultSize={defaultLayout[1]}>{middle}</Panel>
      <PanelResizeHandle className="h-2" />
      <Panel defaultSize={defaultLayout[2]}>{bottom}</Panel>
    </PanelGroup>
  )
}
