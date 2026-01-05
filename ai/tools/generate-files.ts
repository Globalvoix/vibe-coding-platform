import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { getContents, type File } from './generate-files/get-contents'
import { getRichError } from './get-rich-error'
import { getWriteFiles } from './generate-files/get-write-files'
import { tool } from 'ai'
import description from './generate-files.md'
import z from 'zod/v3'
import { upsertProjectFiles } from '@/lib/project-files-db'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId: string
  projectId?: string
}

export const generateFiles = ({ writer, modelId, userId, projectId }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: [], status: 'generating' },
      })

      let sandbox: Sandbox | null = null

      try {
        sandbox = await Sandbox.get({ sandboxId })
      } catch (error) {
        const richError = getRichError({
          action: 'get sandbox by id',
          args: { sandboxId },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { error: richError.error, paths: [], status: 'error' },
        })

        return richError.message
      }

      const writeFiles = getWriteFiles({ sandbox, toolCallId, writer })

      const normalizePath = (p: string) => p.trim().replace(/^\.{1,2}\//, '').replace(/^\//, '')

      const getLatestUserText = (msgs: unknown[]) => {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i] as { role?: unknown; content?: unknown } | null
          if (!msg || msg.role !== 'user') continue

          const content = msg.content
          if (typeof content === 'string') return content

          if (Array.isArray(content)) {
            const textParts = content
              .map((part) => {
                if (!part || typeof part !== 'object') return ''
                const p = part as { type?: unknown; text?: unknown }
                if (p.type === 'text' && typeof p.text === 'string') return p.text
                return ''
              })
              .filter(Boolean)
            if (textParts.length > 0) return textParts.join('\n')
          }

          return ''
        }
        return ''
      }

      const inferAppType = (text: string) => {
        const t = text.toLowerCase()
        if (/(e-?commerce|shop|store|product|cart|checkout|amazon|walmart)/.test(t)) return 'ecommerce' as const
        if (/(netflix|streaming|watch|movies|tv|youtube|video)/.test(t)) return 'streaming' as const
        if (/(dashboard|admin|analytics|metrics|report)/.test(t)) return 'dashboard' as const
        if (/(landing|marketing|waitlist|pricing|neon\.com|cluely|huly|supabase)/.test(t)) return 'landing' as const
        if (/(auth|login|signup|sign in|sign up)/.test(t)) return 'auth' as const
        return 'saas' as const
      }

      const shouldEnforceMultiPage = (text: string) =>
        /(build|create|generate|make|clone|design|website|web\s*app|app\b|e-?commerce|store|shop|dashboard|saas|landing|netflix|amazon|youtube|google|walmart|neon\.com|huly\.io|cluely\.com|supabase)/i.test(
          text
        )

      const getRecommendedNextAppRouterPaths = (appType: ReturnType<typeof inferAppType>) => {
        const base = [
          'app/layout.tsx',
          'app/page.tsx',
          'app/not-found.tsx',
          'lib/data.ts',
          'components/site-header.tsx',
          'components/site-footer.tsx',
        ]

        if (appType === 'ecommerce') {
          return base.concat([
            'app/products/page.tsx',
            'app/products/[id]/page.tsx',
            'app/search/page.tsx',
            'app/cart/page.tsx',
            'app/account/page.tsx',
          ])
        }

        if (appType === 'streaming') {
          return base.concat([
            'app/profiles/page.tsx',
            'app/browse/page.tsx',
            'app/title/[id]/page.tsx',
            'app/search/page.tsx',
            'app/my-list/page.tsx',
          ])
        }

        if (appType === 'dashboard') {
          return base.concat([
            'app/dashboard/page.tsx',
            'app/projects/page.tsx',
            'app/projects/[id]/page.tsx',
            'app/settings/page.tsx',
            'app/billing/page.tsx',
          ])
        }

        if (appType === 'auth') {
          return base.concat([
            'app/sign-in/page.tsx',
            'app/sign-up/page.tsx',
            'app/account/page.tsx',
          ])
        }

        if (appType === 'landing') {
          return base.concat([
            'app/pricing/page.tsx',
            'app/features/page.tsx',
            'app/company/page.tsx',
            'app/contact/page.tsx',
          ])
        }

        return base.concat([
          'app/dashboard/page.tsx',
          'app/projects/page.tsx',
          'app/projects/[id]/page.tsx',
          'app/settings/page.tsx',
        ])
      }

      const normalizedPaths = Array.from(new Set(paths.map(normalizePath))).filter(Boolean)
      const latestUserText = getLatestUserText(Array.isArray(messages) ? (messages as unknown[]) : [])

      const looksLikeNextAppRouter =
        normalizedPaths.some((p) => p === 'app/page.tsx' || p === 'app/page.jsx' || p.startsWith('app/')) ||
        normalizedPaths.some((p) => p === 'app/layout.tsx' || p === 'app/layout.jsx')

      const pageCount = normalizedPaths.filter((p) => /^app\/.+\/page\.(t|j)sx?$/.test(p) || p === 'app/page.tsx' || p === 'app/page.jsx').length

      const shouldAugment = looksLikeNextAppRouter && shouldEnforceMultiPage(latestUserText) && pageCount < 4

      const sandboxFileExists = async (path: string) => {
        try {
          const stream = await sandbox.readFile({ sandboxId, path })
          if (!stream) return false
          return true
        } catch {
          return false
        }
      }

      const extraPaths: string[] = []
      if (shouldAugment) {
        const appType = inferAppType(latestUserText)
        const recommended = getRecommendedNextAppRouterPaths(appType)
        for (const p of recommended) {
          const np = normalizePath(p)
          if (normalizedPaths.includes(np)) continue
          const exists = await sandboxFileExists(np)
          if (!exists) extraPaths.push(np)
        }
      }

      const effectivePaths = normalizedPaths.concat(extraPaths)
      const iterator = getContents({ messages, modelId, paths: effectivePaths })
      const uploaded: File[] = []

      const persistFiles = async (files: File[]) => {
        if (!projectId) return
        if (files.length === 0) return
        try {
          await upsertProjectFiles({
            userId,
            projectId,
            files: files.map((file) => ({ path: file.path, content: file.content })),
          })
        } catch {
          // best-effort
        }
      }

      try {
        for await (const chunk of iterator) {
          if (chunk.files.length > 0) {
            const error = await writeFiles(chunk)
            if (error) {
              return error
            }

            uploaded.push(...chunk.files)
            await persistFiles(chunk.files)
          } else {
            writer.write({
              id: toolCallId,
              type: 'data-generating-files',
              data: {
                status: 'generating',
                paths: chunk.paths,
              },
            })
          }
        }
      } catch (error) {
        const richError = getRichError({
          action: 'generate file contents',
          args: { modelId, paths: effectivePaths },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: {
            error: richError.error,
            status: 'error',
            paths: effectivePaths,
          },
        })

        return richError.message
      }

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: uploaded.map((file) => file.path), status: 'done' },
      })

      return `Successfully generated and uploaded ${
        uploaded.length
      } files. Their paths and contents are as follows:
        ${uploaded
          .map((file) => `Path: ${file.path}\nContent: ${file.content}\n`)
          .join('\n')}`
    },
  })
