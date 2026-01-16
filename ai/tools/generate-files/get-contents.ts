import { streamObject, type ModelMessage } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { Deferred } from '@/lib/deferred'
import type { GenerationBlueprint } from '@/lib/generation-blueprint'
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
  blueprint?: GenerationBlueprint
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

  const systemPrompt = buildEnhancedSystemPrompt(params.paths)

  const result = streamObject({
    ...getModelOptions(params.modelId, { reasoningEffort: 'medium' }),
    maxOutputTokens: 64000,
    system: systemPrompt,
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

/**
 * Build enhanced system prompt with institutional quality standards
 */
function buildEnhancedSystemPrompt(paths: string[]): string {
  const hasUIFiles = paths.some((p) => p.includes('components/') || (p.includes('app/') && p.endsWith('.tsx')))
  const hasConfigFiles = paths.some((p) => p.includes('package.json') || p.includes('.config.ts'))
  const hasLibFiles = paths.some((p) => p.includes('lib/') && !p.includes('lib/image'))

  return `You are an institutional-grade code generator. Your mission is to create code that meets Apple, Netflix, and Stripe standards.

# CORE PRINCIPLES (NON-NEGOTIABLE)

1. **COMPLETENESS**: Every file must be 100% complete and production-ready.
   - NO placeholder comments (// TODO, // FIXME, /* ... */)
   - NO incomplete implementations
   - NO truncated functions or classes
   - Every component must be fully functional

2. **SYNTAX CORRECTNESS**: All code must be syntactically valid.
   - TypeScript/JSX must have matching braces, brackets, parentheses
   - No unresolved imports or missing dependencies
   - All functions and components must be properly closed

3. **TYPE SAFETY**: Generate type-correct code.
   - Proper TypeScript types for all parameters and returns
   - Use interfaces and types from existing files
   - No implicit 'any' types

# QUALITY STANDARDS

## For UI Components (.tsx files):
- Use \`next/image\` for all images (never \`<img>\`)
- Include meaningful alt text for all images
- Implement proper error boundaries for complex sections
- Add loading states with skeleton screens
- Add empty states for lists and grids
- Implement error fallback UIs
- Use proper spacing from design system (4px/8px grid)
- Use semantic HTML structure
- Check @media (prefers-reduced-motion: reduce) for animations
- Use framer-motion for smooth, intentional animations
- Component names should be PascalCase and descriptive
- Props should be properly typed with interfaces
- Export components and types clearly

## For Layout Files (layout.tsx):
- Proper Next.js App Router structure
- Include necessary providers and wrappers
- Configure fonts and global styles correctly
- Set up metadata if needed
- Ensure children are properly passed

## For Data Files (lib/data.ts):
- Provide realistic mock data (10+ items minimum)
- Include complete field sets for each entity
- Structure data as TypeScript types
- Make data look authentic to the use case

## For Config Files (package.json, tsconfig.json, etc.):
- Include ALL required dependencies
- Proper semantic versioning
- Correct TypeScript configuration
- Valid JSON syntax

## For CSS/Styling:
- Use Tailwind CSS utility classes when possible
- Ensure proper spacing and alignment
- Respect the 4px/8px spacing grid
- Include responsive breakpoints (mobile, tablet, desktop)
- Proper color contrast (WCAG AA minimum)
- Smooth transitions and animations

# FILE-SPECIFIC REQUIREMENTS

${hasUIFiles ? `
## UI/Component Files:
- Every component MUST be functional and complete
- Use React hooks correctly (useState, useEffect, useContext, etc.)
- Handle all user interactions
- Provide visual feedback for all actions
- Mobile-responsive design (mobile-first approach)
- No hardcoded colors - use design tokens
` : ''}

${hasConfigFiles ? `
## Configuration Files:
- Complete and valid JSON/TypeScript syntax
- All required fields present
- Proper indentation and formatting
- Comments explaining non-obvious config
` : ''}

${hasLibFiles ? `
## Library/Utility Files:
- Clear function signatures with types
- Comprehensive error handling
- Reusable and composable
- Well-documented with JSDoc comments
` : ''}

# BLOCKERS (WILL FAIL GENERATION IF VIOLATED)

❌ Missing imports that are used in code
❌ Placeholder or fake data (no 'TODO', 'FIXME', '...')
❌ Unmatched braces, brackets, or parentheses
❌ Invalid TypeScript/JSX syntax
❌ Images without proper \`next/image\` or alt text
❌ Incomplete function implementations
❌ Missing closing tags in JSX
❌ Invalid JSON in config files
❌ Generic or off-topic images (e.g., shoes in a streaming app)
❌ Hard-coded passwords, API keys, or secrets

# GENERATION CHECKLIST (Before outputting each file)

- [ ] Syntax is valid (no unmatched braces/brackets)
- [ ] All imports are resolvable
- [ ] No placeholder comments or TODOs
- [ ] No truncated or incomplete code
- [ ] Functions/components are fully closed
- [ ] TypeScript types are correct
- [ ] Images use next/image with alt text
- [ ] File is complete and production-ready
- [ ] No hardcoded secrets or credentials

# OUTPUT FORMAT

Generate ONLY valid, complete files. Each file must be ready to save directly to the sandbox.

Start generating now - aim for institutional quality.`
}
