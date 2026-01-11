import { tool } from 'ai'
import z from 'zod/v3'

interface Params {
  projectId?: string
}

export const webScrape = ({ projectId }: Params) =>
  tool({
    description:
      'Scrape and extract content from websites, converting HTML to structured Markdown format suitable for LLM processing',
    inputSchema: z.object({
      url: z.string().describe('The URL of the webpage to scrape'),
      includeImages: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include image references in the output'),
      includeLinks: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include links in the output'),
      maxChars: z
        .number()
        .optional()
        .default(10000)
        .describe('Maximum number of characters to extract'),
      format: z
        .enum(['markdown', 'html', 'plaintext'])
        .optional()
        .default('markdown')
        .describe('Format for the extracted content'),
    }),
    execute: async (
      { url, includeImages = false, includeLinks = true, maxChars = 10000, format = 'markdown' },
      { toolCallId }
    ) => {
      if (!process.env.FIRECRAWL_API_KEY) {
        return 'Error: Firecrawl API key not configured. Please add it in Settings → Connectors → Firecrawl'
      }

      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url,
            formats: [format],
            includeTags: ['script', 'style'],
            removeBase64ImagesFromMarkdown: !includeImages,
            onlyMainContent: true,
            parsePDF: true,
            timeout: 30000,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          return `Firecrawl API error: ${response.status} ${error}`
        }

        const data = (await response.json()) as {
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
          return 'Failed to scrape the webpage'
        }

        const contentValue = data.data[format as keyof typeof data.data]
        const content = typeof contentValue === 'string' ? contentValue : ''
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

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        return `Error: ${message}`
      }
    },
  })
