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
      <PanelResizeHandle className="group relative w-2 -mx-1 flex items-center justify-center cursor-col-resize select-none z-50">
        <div className="h-full w-[1px] bg-border/40 group-hover:bg-blue-500/50 group-active:bg-blue-500 transition-colors" />
        <div className="absolute rounded-full border border-border/40 bg-background shadow-md px-1 py-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-2.5 rounded-full bg-foreground/20" />
            <div className="h-0.5 w-2.5 rounded-full bg-foreground/20" />
            <div className="h-0.5 w-2.5 rounded-full bg-foreground/20" />
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
      <PanelResizeHandle className="group relative h-3 -my-1 flex items-center justify-center cursor-row-resize select-none">
        <div className="w-full h-px bg-border/60 group-hover:bg-border transition-colors" />
      </PanelResizeHandle>
      <Panel defaultSize={defaultLayout[1]}>{middle}</Panel>
      <PanelResizeHandle className="group relative h-3 -my-1 flex items-center justify-center cursor-row-resize select-none">
        <div className="w-full h-px bg-border/60 group-hover:bg-border transition-colors" />
      </PanelResizeHandle>
      <Panel defaultSize={defaultLayout[2]}>{bottom}</Panel>
    </PanelGroup>
  )
}
