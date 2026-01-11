import { tool } from 'ai'
import z from 'zod/v3'

interface Params {
  projectId?: string
}

export const webSearch = ({ projectId }: Params) =>
  tool({
    description:
      'Search the web using Exa AI-native search engine for research, current information, and discovery',
    inputSchema: z.object({
      query: z.string().describe('The search query to find information on the web'),
      numResults: z
        .number()
        .optional()
        .default(5)
        .describe('Number of results to return (default: 5, max: 30)'),
      includeSummaries: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include summaries of the results'),
      searchType: z
        .enum(['keyword', 'neural'])
        .optional()
        .default('neural')
        .describe('Type of search - neural is better for semantic queries, keyword for specific terms'),
    }),
    execute: async (
      { query, numResults = 5, includeSummaries = true, searchType = 'neural' },
      { toolCallId }
    ) => {
      if (!process.env.EXA_API_KEY) {
        return 'Error: Exa API key not configured. Please add it in Settings → Connectors → Exa'
      }

      try {
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.EXA_API_KEY,
          },
          body: JSON.stringify({
            query,
            numResults,
            contents: {
              text: {
                maxCharacters: 1000,
              },
            },
            type: searchType,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          return `Exa API error: ${response.status} ${error}`
        }

        const data = (await response.json()) as {
          results?: Array<{
            title: string
            url: string
            publishedDate?: string
            author?: string
            score?: number
            text?: string
          }>
        }

        if (!data.results || data.results.length === 0) {
          return 'No results found for your search query'
        }

        const formattedResults = data.results
          .map((result, index) => {
            let formatted = `${index + 1}. **${result.title}**\n`
            formatted += `   URL: ${result.url}\n`
            if (result.publishedDate) {
              formatted += `   Published: ${result.publishedDate}\n`
            }
            if (result.author) {
              formatted += `   Author: ${result.author}\n`
            }
            if (includeSummaries && result.text) {
              const summary =
                result.text.substring(0, 500) + (result.text.length > 500 ? '...' : '')
              formatted += `   Summary: ${summary}\n`
            }
            return formatted
          })
          .join('\n')

        return `Found ${data.results.length} results:\n\n${formattedResults}`
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        return `Error: ${message}`
      }
    },
  })
