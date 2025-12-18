'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { InfoIcon } from 'lucide-react'
import { create } from 'zustand'
import { useEffect } from 'react'

interface State {
  open: boolean | undefined
  setOpen: (open: boolean) => void
}

export const useWelcomeStore = create<State>((set) => ({
  open: undefined,
  setOpen: (open) => set({ open }),
}))

export function Welcome(props: {
  onDismissAction(): void
  defaultOpen: boolean
}) {
  const { open, setOpen } = useWelcomeStore()

  useEffect(() => {
    setOpen(props.defaultOpen)
  }, [setOpen, props.defaultOpen])

  if (!(typeof open === 'undefined' ? props.defaultOpen : open)) {
    return null
  }

  const handleDismiss = () => {
    props.onDismissAction()
    setOpen(false)
  }

  return (
    <div className="fixed w-screen h-screen z-10">
      <div className="absolute w-full h-full bg-secondary opacity-60" />
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleDismiss}
      >
        <div
          className="bg-background max-w-xl mx-4 rounded-lg shadow overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 space-y-4 ">
            <h1 className="text-2xl sans-serif font-semibold tracking-tight mb-7">
              Thinksoft
            </h1>
            <p className="text-base text-primary">
              <strong>Thinksoft</strong> is an AI-powered full-stack development platform
              that brings your ideas to life. Simply enter what you want to build,
              and our advanced AI agent creates complete, production-ready applications.
            </p>
            <p className="text-base text-secondary-foreground">
              Powered by advanced AI models (GPT-5, Claude, and more), integrated with modern development tools like{' '}
              <ExternalLink href="https://supabase.com/">
                Supabase
              </ExternalLink>{' '}
              for databases,{' '}
              <ExternalLink href="https://neon.tech/">
                Neon
              </ExternalLink>{' '}
              for serverless Postgres,{' '}
              <ExternalLink href="https://nextjs.org/">
                Next.js
              </ExternalLink>{' '}
              for frontend frameworks, and{' '}
              <ExternalLink href="https://netlify.com/">
                Netlify
              </ExternalLink>{' '}
              for deployment. Build faster, ship smarter.
            </p>
          </div>
          <footer className="bg-secondary flex justify-end p-4 border-t border-border">
            <Button className="cursor-pointer" onClick={handleDismiss}>
              Try now
            </Button>
          </footer>
        </div>
      </div>
    </div>
  )
}

export function ToggleWelcome() {
  const { open, setOpen } = useWelcomeStore()
  return (
    <Button
      className="cursor-pointer"
      onClick={() => setOpen(!open)}
      variant="outline"
      size="sm"
    >
      <InfoIcon /> <span className="hidden lg:inline">What&apos;s this?</span>
    </Button>
  )
}

function ExternalLink({
  children,
  href,
}: {
  children: ReactNode
  href: string
}) {
  return (
    <a
      className="underline underline-offset-3 text-primary"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  )
}
