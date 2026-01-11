import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'

export function webScrape({
  writer,
  projectId,
}: {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
}) {
  return {
    description: 'Scrape and extract content from websites, converting HTML to structured Markdown format suitable for LLM processing',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the webpage to scrape'
        },
        includeImages: {
          type: 'boolean',
          description: 'Whether to include image references in the output (default: false)',
          default: false
        },
        includeLinks: {
          type: 'boolean',
          description: 'Whether to include links in the output (default: true)',
          default: true
        },
        maxChars: {
          type: 'number',
          description: 'Maximum number of characters to extract (default: 10000)',
          default: 10000
        },
        format: {
          type: 'string',
          enum: ['markdown', 'html', 'plaintext'],
          description: 'Format for the extracted content (default: markdown)',
          default: 'markdown'
        }
      },
      required: ['url']
    },
    execute: async (input: {
      url: string
      includeImages?: boolean
      includeLinks?: boolean
      maxChars?: number
      format?: 'markdown' | 'html' | 'plaintext'
    }) => {
      if (!process.env.FIRECRAWL_API_KEY) {
        return {
          success: false,
          error: 'Firecrawl API key not configured. Please add it in Settings → Connectors → Firecrawl'
        }
      }

      try {
        writer.write({
          type: 'tool-call',
          toolName: 'webScrape',
          args: input,
          result: `Scraping ${input.url}...`
        })

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({
            url: input.url,
            formats: [input.format ?? 'markdown'],
            includeTags: ['script', 'style'],
            removeBase64ImagesFromMarkdown: !input.includeImages,
            onlyMainContent: true,
            parsePDF: true,
            timeout: 30000
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Firecrawl API error: ${response.status} ${error}`)
        }

        const data = await response.json() as {
          success: boolean
          data?: {
            markdown?: string
            html?: string
            plaintext?: string
            metadata?: {
              title?: string
              description?: string
              language?: string
              sourceURL?: string
              robots?: string
              ogLocaleAlternate?: string[]
              charset?: string
            }
          }
        }

        if (!data.success || !data.data) {
          return {
            success: false,
            error: 'Failed to scrape the webpage'
          }
        }

        const format = input.format ?? 'markdown'
        const content = data.data[format as keyof typeof data.data] || ''
        const maxChars = input.maxChars ?? 10000
        const truncated = content.length > maxChars
        const displayContent = truncated ? content.substring(0, maxChars) + '...' : content

        let result = ''
        if (data.data.metadata?.title) {
          result += `# ${data.data.metadata.title}\n\n`
        }
        if (data.data.metadata?.description) {
          result += `> ${data.data.metadata.description}\n\n`
        }
        result += displayContent

        writer.write({
          type: 'tool-result',
          toolName: 'webScrape',
          result: `Successfully scraped content from ${input.url}\n\n${result.substring(0, 2000)}${result.length > 2000 ? '\n\n[Content truncated for display]' : ''}`
        })

        return {
          success: true,
          url: input.url,
          format: format,
          content: content,
          metadata: data.data.metadata,
          isTruncated: truncated,
          originalLength: content.length,
          displayedLength: displayContent.length
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        writer.write({
          type: 'tool-result',
          toolName: 'webScrape',
          result: `Error: ${message}`
        })
        return {
          success: false,
          error: message
        }
      }
    }
  }
}
