import { streamObject, type ModelMessage } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { Deferred } from '@/lib/deferred'
import z from 'zod/v3'

export type File = z.infer<typeof fileSchema>

const fileSchema = z.object({
  path: z
    .string()
    .describe(
      "Path to the file in the Vercel Sandbox (relative paths from sandbox root, e.g., 'src/main.js', 'package.json', 'components/Button.tsx')"
    ),
  content: z
    .string()
    .describe(
      'The content of the file as a utf8 string (complete file contents that will replace any existing file at this path)'
    ),
})

interface Params {
  messages: ModelMessage[]
  modelId: string
  paths: string[]
}

interface FileContentChunk {
  files: z.infer<typeof fileSchema>[]
  paths: string[]
  written: string[]
}

export async function* getContents(
  params: Params
): AsyncGenerator<FileContentChunk> {
  const generated: z.infer<typeof fileSchema>[] = []
  const deferred = new Deferred<void>()
  const result = streamObject({
    ...getModelOptions(params.modelId, { reasoningEffort: 'medium' }),
    maxOutputTokens: 64000,
    system: `You are a file content generator. You must generate files based on the conversation history and the provided paths.

Hard rules:
- NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock).
- Every file you output must be COMPLETE (no placeholders, no TODOs, no "rest of" comments).
- Do not reference local images/assets unless you also create them in the output.

Quality bar (especially for frontend/UI):
- Produce production-grade, realistic UI: thoughtful layout, spacing, typography hierarchy, and micro-interactions (hover/focus/disabled states).
- MUST be multi-page for real apps: if you see Next.js App Router paths (app/*), include a shared layout + navigation and implement multiple real routes/screens (not everything on one page).
- Avoid "single empty page" scaffolds. Include real structure: header/nav, main content with multiple sections, and footer; meaningful empty/loading/error states.
- Use realistic example data and copy (no lorem ipsum, no "Item 1" lists).
- Avoid overusing gradients; default to clean neutral surfaces with 1 accent color.

Images (prevent broken images):
- Use only stable, publicly accessible image URLs from approved sources (prefer https://images.unsplash.com/ or https://images.pexels.com/).
- Always include explicit dimensions (width/height attributes or equivalent) to avoid layout shift.
- Prefer plain <img> tags for maximum compatibility across stacks.
- If you use Next.js <Image>, you MUST also update next.config.* to allow the exact remote domains/patterns you used; otherwise use <img>.
- Add a runtime fallback for failed images (e.g., onError -> swap to https://picsum.photos/... or https://placehold.co/...).

When generating files:
- Generate complete, working file contents that will be used directly.
- Use appropriate imports and dependencies based on the project context.
- For Supabase projects:
  - Use Supabase client libraries (@supabase/supabase-js)
  - Reference environment variables like NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Create database queries and real-time subscriptions when needed
  - Generate proper TypeScript types for database operations
- Ensure all generated code is syntactically correct and imports are valid.
- Maintain consistency with the existing project structure and conventions.`,
    messages: [
      ...params.messages,
      {
        role: 'user',
        content: `Generate the content of the following files according to the conversation: ${params.paths.map(
          (path) => `\n - ${path}`
        )}`,
      },
    ],
    schema: z.object({ files: z.array(fileSchema) }),
    onError: (error) => {
      deferred.reject(error)
      console.error('Error communicating with AI')
      console.error(JSON.stringify(error, null, 2))
    },
  })

  for await (const items of result.partialObjectStream) {
    if (!Array.isArray(items?.files)) {
      continue
    }

    const written = generated.map((file) => file.path)
    const paths = written.concat(
      items.files
        .slice(generated.length, items.files.length - 1)
        .filter((f): f is { path?: string } => f !== undefined)
        .flatMap((f) => (f?.path ? [f.path] : []))
    )

    const files = items.files
      .slice(generated.length, items.files.length - 2)
      .map((file: unknown) => fileSchema.parse(file))

    if (files.length > 0) {
      yield { files, paths, written }
      generated.push(...files)
    } else {
      yield { files: [], written, paths }
    }
  }

  const raceResult = await Promise.race([result.object, deferred.promise])
  if (!raceResult) {
    throw new Error('Unexpected Error: Deferred was resolved before the result')
  }

  const written = generated.map((file) => file.path)
  const files = raceResult.files.slice(generated.length)
  const paths = written.concat(files.map((file: { path: string }) => file.path))
  if (files.length > 0) {
    yield { files, written, paths }
    generated.push(...files)
  }
}
