import type { UIMessage, UIMessageStreamWriter } from 'ai'
import { tool } from 'ai'
import z from 'zod/v3'
import type { DataPart } from '../messages/data-parts'
import description from './extract-design.md'

type ExaSearchResponse = {
  results?: Array<{
    title?: string
    url?: string
    text?: string
  }>
}

type FirecrawlScrapeResponse = {
  success?: boolean
  data?: {
    markdown?: string
    html?: string
    metadata?: {
      title?: string
      sourceURL?: string
    }
  }
  error?: string
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

async function safeFetchText(url: string, signal: AbortSignal, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    signal,
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      ...(init?.headers ?? {}),
      'User-Agent': 'Builder-VibeCodingAgent/1.0',
    },
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return {
      ok: false as const,
      status: res.status,
      contentType,
      text: body.slice(0, 5000),
    }
  }

  if (!contentType.includes('text/') && !contentType.includes('application/json')) {
    return {
      ok: false as const,
      status: res.status,
      contentType,
      text: `Unsupported content-type: ${contentType}`,
    }
  }

  const text = await res.text()
  return { ok: true as const, status: res.status, contentType, text }
}

function extractCodeBlocks(markdown: string, maxBlocks: number) {
  const blocks: string[] = []
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown))) {
    const lang = (match[1] ?? '').trim()
    const code = (match[2] ?? '').trim()
    if (!code) continue

    const header = lang ? `\n\n// language: ${lang}\n` : '\n\n'
    blocks.push(`${header}${code}`)

    if (blocks.length >= maxBlocks) break
  }
  return blocks
}

function looksLikeAuthWall(text: string) {
  const t = text.toLowerCase()
  return (
    t.includes('sign in') ||
    t.includes('log in') ||
    t.includes('login') ||
    t.includes('subscribe') ||
    t.includes('paywall') ||
    t.includes('enable javascript')
  )
}

async function exaSearch({
  query,
  maxResults,
  exaApiKey,
  signal,
}: {
  query: string
  maxResults: number
  exaApiKey: string
  signal: AbortSignal
}) {
  const res = await fetch('https://api.exa.ai/v1/search', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': exaApiKey,
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      text: true,
      type: 'auto',
      livecrawl: 'fallback',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`EXA search failed: ${res.status} ${body.slice(0, 500)}`)
  }

  return (await res.json()) as ExaSearchResponse
}

async function firecrawlScrape({
  url,
  firecrawlApiKey,
  signal,
}: {
  url: string
  firecrawlApiKey: string
  signal: AbortSignal
}) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firecrawlApiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: false,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Firecrawl scrape failed: ${res.status} ${body.slice(0, 500)}`)
  }

  return (await res.json()) as FirecrawlScrapeResponse
}

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  envVars?: Record<string, string>
}

export const extractDesign = ({ writer, envVars }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .describe(
          'Search query for the component/template to extract (e.g., "framer motion scroll reveal code" or "magicui animated button")'
        ),
      maxSources: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe('Maximum number of source pages to extract from.'),
      sourceUrls: z
        .array(z.string())
        .optional()
        .describe(
          'Optional explicit URLs to scrape instead of searching (must be publicly accessible).' 
        ),
      purpose: z
        .string()
        .min(3)
        .describe(
          'How the extracted code will be used (e.g., "hero animation", "pricing table", "carousel")' 
        ),
    }),
    execute: async ({ query, maxSources, sourceUrls, purpose }, { toolCallId }) => {
      const exaApiKey = envVars?.EXA_API_KEY || process.env.EXA_API_KEY
      const firecrawlApiKey = envVars?.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY

      if (!exaApiKey) {
        return 'Design extraction is not configured: missing EXA_API_KEY.'
      }
      if (!firecrawlApiKey) {
        return 'Design extraction is not configured: missing FIRECRAWL_API_KEY.'
      }

      writer.write({
        id: toolCallId,
        type: 'data-extract-design',
        data: { status: 'searching', query, purpose, sources: [] },
      })

      let urls: string[] = []
      const normalizedSourceUrls = (sourceUrls ?? [])
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, maxSources)

      if (normalizedSourceUrls.length > 0) {
        urls = normalizedSourceUrls
      } else {
        const preferredSites = ['21st.dev', 'reactbits.dev']
        const siteQueries = [query, ...preferredSites.map((site) => `${query} site:${site}`)]

        const seen = new Set<string>()
        const collected: string[] = []

        for (const q of siteQueries) {
          if (collected.length >= maxSources) break

          const results = await withTimeout(
            (signal) =>
              exaSearch({
                query: q,
                maxResults: Math.max(5, maxSources * 2),
                exaApiKey,
                signal,
              }),
            15000
          )

          for (const r of results.results ?? []) {
            const u = r.url
            if (typeof u !== 'string' || !u) continue
            if (seen.has(u)) continue
            seen.add(u)
            collected.push(u)
            if (collected.length >= maxSources) break
          }
        }

        urls = collected

        if (urls.length === 0) {
          writer.write({
            id: toolCallId,
            type: 'data-extract-design',
            data: { status: 'done', query, purpose, sources: [], note: 'No sources found.' },
          })
          return `No sources found for query: ${query}`
        }
      }

      writer.write({
        id: toolCallId,
        type: 'data-extract-design',
        data: { status: 'extracting', query, purpose, sources: urls },
      })

      const extracted: Array<{
        url: string
        title?: string
        codeBlocks: string[]
        markdownSnippet?: string
        warning?: string
      }> = []

      for (const url of urls) {
        try {
          const scraped = await withTimeout(
            (signal) => firecrawlScrape({ url, firecrawlApiKey, signal }),
            20000
          )
          const markdown = scraped.data?.markdown ?? ''

          if (!markdown) {
            extracted.push({
              url,
              title: scraped.data?.metadata?.title,
              codeBlocks: [],
              warning: 'No markdown content extracted.',
            })
            continue
          }

          if (looksLikeAuthWall(markdown)) {
            extracted.push({
              url,
              title: scraped.data?.metadata?.title,
              codeBlocks: [],
              warning:
                'This page looks gated (login/subscribe). Only public sources can be extracted.',
            })
            continue
          }

          const codeBlocks = extractCodeBlocks(markdown, 6)
          const markdownSnippet = markdown.slice(0, 4000)

          extracted.push({
            url,
            title: scraped.data?.metadata?.title,
            codeBlocks,
            markdownSnippet: codeBlocks.length > 0 ? undefined : markdownSnippet,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)

          // As a fallback, attempt a direct fetch to provide something useful when scraping fails.
          try {
            const fallback = await withTimeout(
              (signal) => safeFetchText(url, signal),
              15000
            )
            extracted.push({
              url,
              codeBlocks: [],
              markdownSnippet: fallback.text.slice(0, 4000),
              warning: `Scrape failed (${message}). Returned fallback text (${fallback.contentType}).`,
            })
          } catch (fallbackError) {
            extracted.push({
              url,
              codeBlocks: [],
              warning: `Scrape failed (${message}) and fallback fetch failed (${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}).`,
            })
          }
        }
      }

      writer.write({
        id: toolCallId,
        type: 'data-extract-design',
        data: {
          status: 'done',
          query,
          purpose,
          sources: extracted.map((e) => e.url),
        },
      })

      const resultText = extracted
        .map((e, i) => {
          const header = `SOURCE ${i + 1}: ${e.title ? `${e.title} — ` : ''}${e.url}`
          const warning = e.warning ? `\nNOTE: ${e.warning}` : ''
          const body =
            e.codeBlocks.length > 0
              ? e.codeBlocks.join('\n\n')
              : e.markdownSnippet
                ? e.markdownSnippet
                : '(no extractable content)'

          return `${header}${warning}\n\n${body}`
        })
        .join('\n\n---\n\n')

      return [
        `Extracted design references for: ${purpose}`,
        `Query: ${query}`,
        '',
        'IMPORTANT: Use these as inspiration only. Do not copy verbatim; remix structure, spacing, and tokens to match the target style profile.',
        '',
        resultText,
      ].join('\n')
    },
  })
