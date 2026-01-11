import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'

export function webSearch({
  writer,
  projectId,
}: {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
}) {
  return {
    description: 'Search the web using Exa AI-native search engine for research, current information, and discovery',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find information on the web'
        },
        numResults: {
          type: 'number',
          description: 'Number of results to return (default: 5, max: 30)',
          default: 5
        },
        includeSummaries: {
          type: 'boolean',
          description: 'Whether to include summaries of the results (default: true)',
          default: true
        },
        searchType: {
          type: 'string',
          enum: ['keyword', 'neural'],
          description: 'Type of search - neural is better for semantic queries, keyword for specific terms (default: neural)',
          default: 'neural'
        }
      },
      required: ['query']
    },
    execute: async (input: {
      query: string
      numResults?: number
      includeSummaries?: boolean
      searchType?: 'keyword' | 'neural'
    }) => {
      if (!process.env.EXA_API_KEY) {
        return {
          success: false,
          error: 'Exa API key not configured. Please add it in Settings → Connectors → Exa'
        }
      }

      try {
        writer.write({
          type: 'tool-call',
          toolName: 'webSearch',
          args: input,
          result: 'Searching the web...'
        })

        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.EXA_API_KEY
          },
          body: JSON.stringify({
            query: input.query,
            numResults: input.numResults ?? 5,
            contents: {
              text: {
                maxCharacters: 1000
              }
            },
            type: input.searchType ?? 'neural'
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Exa API error: ${response.status} ${error}`)
        }

        const data = await response.json() as {
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
          return {
            success: true,
            results: [],
            message: 'No results found for your search query'
          }
        }

        const formattedResults = data.results.map((result, index) => {
          let formatted = `${index + 1}. **${result.title}**\n`
          formatted += `   URL: ${result.url}\n`
          if (result.publishedDate) {
            formatted += `   Published: ${result.publishedDate}\n`
          }
          if (result.author) {
            formatted += `   Author: ${result.author}\n`
          }
          if (input.includeSummaries && result.text) {
            formatted += `   Summary: ${result.text.substring(0, 500)}${result.text.length > 500 ? '...' : ''}\n`
          }
          return formatted
        }).join('\n')

        writer.write({
          type: 'tool-result',
          toolName: 'webSearch',
          result: `Found ${data.results.length} results:\n\n${formattedResults}`
        })

        return {
          success: true,
          results: data.results,
          count: data.results.length
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        writer.write({
          type: 'tool-result',
          toolName: 'webSearch',
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
