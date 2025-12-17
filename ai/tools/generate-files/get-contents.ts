import { streamObject, type ModelMessage } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { Models } from '@/ai/constants'
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
  envVars?: Record<string, string>
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
  const reasoningEffort =
    params.modelId === Models.OpenAIGPT5 ? 'medium' : 'minimal'
  const supabaseConnected = params.envVars && 'NEXT_PUBLIC_SUPABASE_URL' in params.envVars

  const supabaseContext = supabaseConnected
    ? `\n\n## Supabase is Connected\nThe project has Supabase connected with these env vars:\n- NEXT_PUBLIC_SUPABASE_URL\n- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\nWhen generating code:\n1. Create lib/supabase.ts that initializes the Supabase client using these env vars\n2. Import and use the supabase client in pages/components that need database access\n3. Never hardcode Supabase credentials\n4. Include @supabase/supabase-js in package.json\n\nFor ENHANCING EXISTING APPS:\n- Create focused utility files like lib/db-functions.ts, lib/history.ts, lib/api-client.ts\n- Update existing page/component files to integrate new features\n- Don't regenerate entire files unless necessary\n- Wire new database calls into existing UI elements\n\nExample lib/supabase.ts:\n\`\`\`typescript\nimport { createClient } from '@supabase/supabase-js'\nconst supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!\nconst supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\nexport const supabase = createClient(supabaseUrl, supabaseKey)\n\`\`\``
    : ''

  const envVarsContext = params.envVars
    ? `\n\n## Available Environment Variables\nThe project has these environment variables available:\n${Object.keys(params.envVars)
        .map((key) => `- ${key}`)
        .join('\n')}\n\nYou MUST include a .env.local file with these variables. NEVER hardcode secrets; use process.env or import.meta.env to reference these variables in your code.${supabaseContext}`
    : ''

  const result = streamObject({
    ...getModelOptions(params.modelId, { reasoningEffort }),
    maxOutputTokens: 64000,
    system:
      `You are a file content generator. You must generate files based on the conversation history and the provided paths.

CRITICAL RULES:
1. NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock) - these are automatically created by package managers
2. When updating EXISTING files (like app/page.tsx), preserve the existing code and ONLY add/modify the sections needed for the new feature
3. When creating NEW utility files (like lib/history.ts, lib/db-functions.ts), make them focused and reusable
4. ALWAYS use Supabase environment variables when database operations are needed - NEVER hardcode credentials
5. For enhancing apps with new features, generate files in this order: utilities first (lib/*), then component updates (app/*)

DESIGN PHILOSOPHY - APP TYPE MATTERS:
- FUNCTIONAL TOOLS (calculator, forms, notes, timers): Minimal UI, NO animations, NO gradients, clean layouts, functionality first
- AUTH PAGES: Professional, trustworthy appearance, simple centered forms, NO decorative effects
- E-COMMERCE: Product focus with clean grids, NO animations distracting from products, NO elaborate backgrounds
- DASHBOARDS: Clean information hierarchy, minimal animations (only state changes), professional colors
- AVOID: Adding animations/gradients/3D just to look "premium" - let app type guide design

When the project involves UI or frontend:
- Identify the app type first (functional tool, auth, store, dashboard, marketing)
- Apply DOMAIN-SPECIFIC design patterns - a calculator looks like a real calculator, not a trendy portfolio site
- Use Next.js + Tailwind for clean, responsive design
- Quality comes from clarity and functionality, NOT from animations and effects
- Add complexity (animations, scroll effects, 3D) ONLY if it serves the app's purpose
- Default to simplicity - users prefer apps that work clearly over apps that look flashy${envVarsContext}`,
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
        .flatMap((f) => (f?.path ? [f.path] : []))
    )

    const files = items.files
      .slice(generated.length, items.files.length - 2)
      .map((file) => fileSchema.parse(file))

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
  const paths = written.concat(files.map((file) => file.path))
  if (files.length > 0) {
    yield { files, written, paths }
    generated.push(...files)
  }
}
