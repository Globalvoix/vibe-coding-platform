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
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 decoration-border/70 hover:decoration-border text-foreground/90"
          {...props}
        >
          {children}
        </a>
      ),
      code: ({ children, className, ...props }) => {
        const match = /language-(\w+)/.exec(className || '')
        return match ? (
          <code
            className={`${className} bg-[#F3F3EF] dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-[#2D2D2D] dark:text-zinc-300 border border-black/[0.02]`}
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            className="bg-[#F3F3EF] dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-[#2D2D2D] dark:text-zinc-300 border border-black/[0.02]"
            {...props}
          >
            {children}
          </code>
        )
      },
      pre: ({ children, ...props }) => (
        <pre
          className="bg-[#F9F9F7] dark:bg-zinc-900/50 p-5 rounded-2xl overflow-x-auto text-[13px] border border-black/[0.04] my-5 font-mono shadow-[0_4px_12px_-4px_rgba(0,0,0,0.03)]"
          {...props}
        >
          {children}
        </pre>
      ),
      h1: ({ children, ...props }) => (
        <h1
          className="text-[20px] font-bold mb-4 mt-6 first:mt-0 text-foreground font-sans tracking-tight"
          {...props}
        >
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2
          className="text-[18px] font-bold mb-3 mt-5 first:mt-0 text-foreground font-sans tracking-tight"
          {...props}
        >
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3
          className="text-[16px] font-semibold mb-2 mt-4 first:mt-0 text-foreground/90 font-sans tracking-tight"
          {...props}
        >
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p
          className="mb-5 last:mb-0 leading-[1.75] text-foreground/85 font-sans text-[15px]"
          {...props}
        >
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul
          className="list-disc pl-6 mb-5 space-y-2.5 text-foreground/85 font-sans text-[15px]"
          {...props}
        >
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol
          className="list-decimal pl-6 mb-5 space-y-2.5 text-foreground/85 font-sans text-[15px]"
          {...props}
        >
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="marker:text-foreground/30 leading-[1.7]" {...props}>
          {children}
        </li>
      ),
      strong: ({ children, ...props }) => (
        <strong className="font-bold text-foreground" {...props}>
          {children}
        </strong>
      ),
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="border-l-3 border-[#D2E3FC] bg-[#F3F3EF]/50 pl-5 pr-4 py-3 rounded-r-xl my-5 text-foreground/80 italic font-medium text-[15px]"
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
