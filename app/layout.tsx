import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ChatScopeProvider } from '@/components/providers/chat-scope-provider'
import { CommandLogsStream } from '@/components/commands-logs/commands-logs-stream'
import { ErrorMonitor } from '@/components/error-monitor/error-monitor'
import { SandboxState } from '@/components/modals/sandbox-state'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const title = 'Thinksoft - Full-Stack Vibe Coding Platform'
const description = `Thinksoft is a full-stack vibe coding platform that transforms your ideas into reality. Get beautiful, production-ready frontends with enterprise-grade backends powered by advanced AI. Build complete web apps, SaaS platforms, e-commerce stores, and more with zero boilerplate.`

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title,
  description,
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ClerkRootProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} antialiased`}>
          <Suspense fallback={null}>
            <NuqsAdapter>
              <ChatScopeProvider>
                <ErrorMonitor>{children}</ErrorMonitor>
              </ChatScopeProvider>
            </NuqsAdapter>
          </Suspense>
          <Toaster />
          <CommandLogsStream />
          <SandboxState />
        </body>
      </html>
    </ClerkRootProvider>
  )
}
