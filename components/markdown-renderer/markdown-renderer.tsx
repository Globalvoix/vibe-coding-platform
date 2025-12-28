import type { Components } from 'react-markdown'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: {
  content: string
}) {
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
        <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0" {...props}>
          {children}
        </h3>
      ),
      ul: ({ children, ...props }) => (
        <ul className="list-disc pl-4 mb-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="list-decimal pl-4 mb-2 space-y-1" {...props}>
          {children}
        </ol>
      ),
      p: ({ children, ...props }) => (
        <p className="mb-2 last:mb-0" {...props}>
          {children}
        </p>
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
      {content}
    </ReactMarkdown>
  )
})
