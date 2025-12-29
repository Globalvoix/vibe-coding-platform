import type { Components } from 'react-markdown'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

function sanitizeSandboxPreviewUrls(markdown: string) {
  const lines = markdown.split('\n')
  const out: string[] = []
  let inFence = false

  for (const rawLine of lines) {
    const line = rawLine

    if (line.trim().startsWith('```')) {
      inFence = !inFence
      out.push(line)
      continue
    }

    if (inFence) {
      out.push(line)
      continue
    }

    const isPreviewUrlLine =
      /^\s*Preview URL:\s*https?:\/\/sb-[\w-]+\.vercel\.run\S*\s*$/i.test(
        line
      ) || /^\s*https?:\/\/sb-[\w-]+\.vercel\.run\S*\s*$/i.test(line)

    if (isPreviewUrlLine) continue

    const replaced = line.replace(
      /https?:\/\/sb-[\w-]+\.vercel\.run\S*/gi,
      ''
    )

    if (/^\s*Preview URL:\s*$/i.test(replaced)) continue

    out.push(replaced)
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: {
  content: string
}) {
  const safeContent = useMemo(() => sanitizeSandboxPreviewUrls(content), [content])

  const components = useMemo<Components>(
    () => ({
      a: ({ children, href, ...props }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
      code: ({ children, className, ...props }) => {
        const match = /language-(\w+)/.exec(className || '')
        return match ? (
          <code
            className={`${className} bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[13px] font-mono text-[#444] dark:text-zinc-300`}
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            className="bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[13px] font-mono text-[#444] dark:text-zinc-300"
            {...props}
          >
            {children}
          </code>
        )
      },
      pre: ({ children, ...props }) => (
        <pre
          className="bg-[#F4F4F1] dark:bg-zinc-900/50 p-4 rounded-xl overflow-x-auto text-[13px] border border-border/40 my-4 font-mono shadow-sm"
          {...props}
        >
          {children}
        </pre>
      ),
      h1: ({ children, ...props }) => (
        <h1 className="text-xl font-semibold mb-3 mt-6 first:mt-0 text-foreground/90 font-sans" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-lg font-semibold mb-2.5 mt-5 first:mt-0 text-foreground/90 font-sans" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-md font-semibold mb-2 mt-4 first:mt-0 text-foreground/90 font-sans" {...props}>
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p className="mb-4 last:mb-0 leading-[1.6] text-foreground/90 font-sans text-[15px]" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul className="list-disc pl-5 mb-4 space-y-2 text-foreground/80 font-sans text-[14px]" {...props}>
          {children}
        </ul>
      ),
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="border-l-4 border-muted pl-4 italic my-2"
          {...props}
        >
          {children}
        </blockquote>
      ),
    }),
    []
  )

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {safeContent}
    </ReactMarkdown>
  )
})
