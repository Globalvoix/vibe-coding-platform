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

      const withTimeout = async <T,>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)
        try {
          return await fn(controller.signal)
        } finally {
          clearTimeout(timeout)
        }
      }

      const fetchOk = async (url: string, timeoutMs = 5000) => {
        const attempt = async (signal: AbortSignal, method: 'HEAD' | 'GET') => {
          const res = await fetch(url, {
            method,
            redirect: 'follow',
            headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
            signal,
          })
          return res.ok
        }

        try {
          return await withTimeout((signal: AbortSignal) => attempt(signal, 'HEAD') as unknown as Promise<boolean>, timeoutMs)
        } catch {
          // Some CDNs reject HEAD; retry with a tiny GET.
          try {
            return await withTimeout((signal: AbortSignal) => attempt(signal, 'GET') as unknown as Promise<boolean>, timeoutMs)
          } catch {
            return false
          }
        }
      }

      const extractQuotedHttpsUrls = (content: string) => {
        const urls = new Set<string>()
        const re = /(src|poster)\s*=\s*(["'])(https?:\/\/[^"']+)\2/g
        let match: RegExpExecArray | null
        while ((match = re.exec(content))) {
          const url = match[3]
          if (url && /^https?:\/\//.test(url)) urls.add(url)
        }
        return [...urls]
      }

      const isMediaUrl = (url: string) => {
        if (!/^https?:\/\//.test(url)) return false
        if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) return false
        return true
      }

      const fallbackForUrl = (url: string) => {
        const lower = url.toLowerCase()
        const isVideo = /\.(mp4|webm|ogg)(\?|#|$)/.test(lower) || /videos\.pexels\.com\//.test(lower)
        if (isVideo) {
          return 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
        }

        const seed =
          Array.from(url)
            .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
            .toString(16) || '0'
        return `https://picsum.photos/seed/${seed}/1200/800`
      }

      const repairMediaUrlsInFiles = async (files: File[]) => {
        const urlSet = new Set<string>()
        for (const f of files) {
          for (const url of extractQuotedHttpsUrls(f.content)) {
            if (isMediaUrl(url)) urlSet.add(url)
          }
        }

        const urls = [...urlSet].slice(0, 25)
        if (urls.length === 0) return files

        const checks = await Promise.all(
          urls.map(async (url) => {
            const ok = await fetchOk(url)
            return { url, ok }
          })
        )

        const replacements = new Map<string, string>()
        for (const { url, ok } of checks) {
          if (!ok) replacements.set(url, fallbackForUrl(url))
        }
        if (replacements.size === 0) return files

        return files.map((file) => {
          let content = file.content
          for (const [bad, good] of replacements.entries()) {
            if (content.includes(bad)) content = content.split(bad).join(good)
          }
          return content === file.content ? file : { ...file, content }
        })
      }

      const readSandboxTextFile = async (path: string) => {
        const stream = await sandbox!.readFile({ path })
        if (!stream) return null

        const anyStream = stream as unknown as any
        if (anyStream && typeof anyStream.getReader === 'function') {
          // Web ReadableStream
          return await new Response(anyStream).text()
        }

        // Node stream
        return await new Promise<string>((resolve, reject) => {
          let data = ''
          anyStream.setEncoding?.('utf8')
          anyStream.on?.('data', (chunk: string) => {
            data += chunk
          })
          anyStream.on?.('end', () => resolve(data))
          anyStream.on?.('error', reject)
        })
      }

      const getPackageName = (specifier: string) => {
        if (specifier.startsWith('node:')) return null
        if (specifier.startsWith('.') || specifier.startsWith('/')) return null
        if (specifier.startsWith('next/')) return 'next'
        if (specifier.startsWith('react/')) return 'react'

        const parts = specifier.split('/')
        if (specifier.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier
        return parts[0]
      }

      const ensurePackageJsonDeps = async (files: File[], forceNextMinimum: boolean) => {
        const importSpecifiers = new Set<string>()
        const importRe = /(?:from\s+['"]([^'\"]+)['"]|require\(\s*['"]([^'\"]+)['"]\s*\)|import\(\s*['"]([^'\"]+)['"]\s*\))/g

        for (const f of files) {
          const content = f.content
          let match: RegExpExecArray | null
          while ((match = importRe.exec(content))) {
            const spec = match[1] || match[2] || match[3]
            if (spec) importSpecifiers.add(spec)
          }
        }

        const builtins = new Set([
          'assert',
          'buffer',
          'child_process',
          'crypto',
          'dns',
          'events',
          'fs',
          'http',
          'https',
          'net',
          'os',
          'path',
          'querystring',
          'stream',
          'timers',
          'tls',
          'tty',
          'url',
          'util',
          'zlib',
        ])

        const packages = new Set<string>()
        for (const spec of importSpecifiers) {
          const pkg = getPackageName(spec)
          if (!pkg) continue
          if (builtins.has(pkg)) continue
          packages.add(pkg)
        }

        if (forceNextMinimum) {
          packages.add('next')
          packages.add('react')
          packages.add('react-dom')
        }

        // These are Next built-ins and should not be added as separate deps.
        packages.delete('next/image')
        packages.delete('next/link')

        if (packages.size === 0) return

        const pkgPath = 'package.json'
        const existingPkgText = await readSandboxTextFile(pkgPath)
        let pkg: any
        try {
          pkg = existingPkgText ? JSON.parse(existingPkgText) : { name: 'app', private: true }
        } catch {
          pkg = { name: 'app', private: true }
        }

        pkg.dependencies = pkg.dependencies && typeof pkg.dependencies === 'object' ? pkg.dependencies : {}

        let changed = false
        for (const dep of packages) {
          if (pkg.dependencies[dep]) continue
          pkg.dependencies[dep] = 'latest'
          changed = true
        }

        if (!changed) return

        const updated = JSON.stringify(pkg, null, 2) + '\n'
        await sandbox!.writeFiles([{ path: pkgPath, content: Buffer.from(updated, 'utf8') }])
      }

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
          const stream = await sandbox.readFile({ path })
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
            const repairedFiles = await repairMediaUrlsInFiles(chunk.files)
            const error = await writeFiles({ ...chunk, files: repairedFiles })
            if (error) {
              return error
            }

            uploaded.push(...repairedFiles)
            await persistFiles(repairedFiles)
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

      // Best-effort dependency enforcement to prevent runtime "module not found" errors.
      // Only triggers after generation to avoid interfering with streaming writes.
      try {
        await ensurePackageJsonDeps(uploaded, looksLikeNextAppRouter)
      } catch {
        // best-effort
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
