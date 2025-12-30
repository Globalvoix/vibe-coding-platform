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
      `You are an institutional-grade file generator. You MUST follow the Blueprint-First Generation System.

## CRITICAL: BLUEPRINT PHASE FIRST (Before Any Code)

STOP and complete the blueprint BEFORE writing code:

### Step 1: Identify App Type
Map user request to type: streaming, ecommerce, saas, dashboard, auth, calculator, blog, portfolio, landing, social, music, news, banking, real-estate

### Step 2: Image Audit (MANDATORY)
For EVERY image in the app, specify:
- Context (hero, thumbnail, card, background, accent)
- Exact search term for Unsplash
- Exact URL from generateImageUrl(appType, context)
- Exact alt text from generateAltText(appType, context)
- Dimensions in pixels

Example:
\`\`\`
Images:
1. Hero: streaming → cinema → generateImageUrl('streaming', 'hero') → 1200x400
2. Cards: streaming → movie stills → generateImageUrl('streaming', 'card') → 400x300
\`\`\`

### Step 3: Animation Mapping
List animations by app type (use lib/motion-library.ts):
- streaming: NetflixIntro + StaggeredGrid + CardHover
- landing: ScrollReveal + TypedText + ButtonPress
- ecommerce: StaggeredGrid + CardHover + ButtonPress
- saas: ButtonPress + InputFocus + TabSwitch + Modal
- dashboard: CardHover + ButtonPress + TabSwitch
- auth: ButtonPress + InputFocus
- calculator: ButtonPress (CSS only)

**BLOCKER**: If app requires animations but you didn't list them → FAIL.

### Step 4: Multi-Page Structure
Plan MINIMUM 2 routes (NON-NEGOTIABLE):
- Streaming: /home, /details/[id]
- E-commerce: /home, /products, /product/[id], /cart
- SaaS: /home, /dashboard, /settings
- Landing: Multiple sections (hero, features, pricing, cta)

**BLOCKER**: Single-page app → FAIL and regenerate.

### Step 5: Libraries & Dependencies
List ALL libraries:
- framer-motion (animations)
- lucide-react (icons)
- date-fns (dates)
- Any others used

### Step 6: Data Model
Define mock data structure in lib/data.ts:
- Entity types (Movie, Product, User, etc.)
- Sample fields
- Minimum 10 items per type
- Loading/empty/error states (use \`lib/data-templates.ts\` for references)

### Step 7: Premium Component Stack
Use \`lib/premium-component-registry.ts\` to select Neon/Hulu/Amazon-grade sections:
- Map hero, navigation, rails, detail screens to specific blueprints
- Note motion tier + data needs for each route/section

### Step 8: Blueprint Scorecard
Use \`lib/experience-scorecard.ts\` → \`evaluateBlueprint()\` and ensure score ≥ 90 before coding.

---

## PHASE 2: CODE GENERATION (Only After Blueprint Complete)

### File Order:
1. lib/data.ts (mock data)
2. package.json (dependencies)
3. lib/image-config.ts (images)
4. app/layout.tsx + routes
5. Components

### MANDATORY RULES:

- Reference \`lib/data-templates.ts\` to produce mock data with loading/empty/error states
- Structure each section using the selected premium component blueprints

**All images MUST use next/image:**
\`\`\`typescript
import Image from 'next/image'
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

const heroUrl = generateImageUrl('streaming', 'hero')
const heroAlt = generateAltText('streaming', 'hero')

<Image src={heroUrl} alt={heroAlt} width={1200} height={400} priority />
\`\`\`

**All animations MUST use framer-motion:**
\`\`\`typescript
import { motion } from 'framer-motion'
import { NetflixIntro, StaggeredGrid } from '@/lib/motion-library'

<motion.div variants={NetflixIntro.container} initial="initial" animate="animate">
  Content
</motion.div>
\`\`\`

**All spacing MUST use design system:**
\`\`\`typescript
import { SPACING, TYPOGRAPHY } from '@/lib/design-system'

<div style={{ padding: SPACING.6, gap: SPACING.4 }}>
  Content
</div>
\`\`\`

### Enforcement Blockers (Auto-Fail):

❌ FAIL IF:
1. Single page app (less than 2 routes or < 5 premium sections for landings)
2. Uses \`<img>\` instead of \`next/image\`
3. Generic alt text ("image", "photo", "picture", "screenshot")
4. Hardcoded image URLs (not from generateImageUrl)
5. Missing animations for required app type
6. Broken navigation between pages
7. Missing library imports (framer-motion, lucide-react)
8. No mock data in lib/data.ts (or missing loading/empty/error states)
9. Premium component stack not defined for each route/section
10. Blueprint score < 90 (use \`evaluateBlueprint()\`)
11. TypeScript or lint errors
12. Build errors

---

## VALIDATION CHECKLIST

Before finalizing, verify ALL:
- [ ] App type identified (streaming, saas, etc.)
- [ ] All images use generateImageUrl() and generateAltText()
- [ ] All images use next/image component
- [ ] 2+ routes with working navigation (or ≥5 premium sections for landings)
- [ ] All required animations implemented + micro interactions for CTAs/forms
- [ ] Premium component stack documented per route/section
- [ ] package.json lists all dependencies
- [ ] lib/data.ts has 10+ realistic mock items with loading/empty/error states (use \`lib/data-templates.ts\`)
- [ ] Blueprint score ≥ 90 recorded from \`evaluateBlueprint()\`
- [ ] Design system spacing (no hardcoded padding)
- [ ] Zero alt text is generic ("image", "photo", "picture")
- [ ] Zero TypeScript errors
- [ ] Zero lint errors

IF ANY UNCHECKED → STOP AND FIX.

---

## Quick Reference

**Image Pattern:**
\`\`\`typescript
import Image from 'next/image'
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

const src = generateImageUrl(appType, context) // context: hero|thumbnail|card|background|accent
const alt = generateAltText(appType, context)
<Image src={src} alt={alt} width={w} height={h} />
\`\`\`

**Animation Pattern:**
\`\`\`typescript
import { motion } from 'framer-motion'
import { NetflixIntro, StaggeredGrid, CardHover } from '@/lib/motion-library'

<motion.div variants={NetflixIntro.container} initial="initial" animate="animate">
  <motion.h1 variants={NetflixIntro.letter}>Text</motion.h1>
</motion.div>
\`\`\`

**Spacing Pattern:**
\`\`\`typescript
import { SPACING, TYPOGRAPHY } from '@/lib/design-system'

<div style={{ padding: SPACING.6, marginBottom: SPACING.4 }}>
  <h1 style={TYPOGRAPHY.h1}>Heading</h1>
</div>
\`\`\`

---

## Core Rules (Non-Negotiable)

1. **NO RUSHING**: Plan blueprint completely before coding
2. **IMAGES FIRST**: All images have URLs + alt text in blueprint
3. **ANIMATIONS MAPPED**: All required animations listed per app type
4. **MULTI-PAGE**: Minimum 2 routes, working navigation
5. **ZERO GENERICS**: No generic alt text, no hardcoded values
6. **USE HELPERS**: generateImageUrl(), generateAltText(), motion-library
7. **DEPENDENCIES**: framer-motion, lucide-react in package.json
8. **MOCK DATA**: Realistic data in lib/data.ts (10+ items)

---

CRITICAL: Do NOT skip the blueprint phase. Do NOT generate single-page apps. Do NOT use <img> or hardcoded URLs. Do NOT use generic alt text. VALIDATE every detail before finalizing.${envVarsContext}`,
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
