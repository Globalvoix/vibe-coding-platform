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
    ...getModelOptions(params.modelId, { reasoningEffort: 'minimal' }),
    maxOutputTokens: 64000,
    system: `You are an enterprise-grade file content generator for world-class, unbeatable frontend applications.

CORE PRINCIPLES:
- Generate code matching Apple, Stripe, Vercel design—sophisticated through simplicity, NOT complexity.
- Every component must feel intentional, polished, and professional. Excellence through restraint.
- Use Next.js App Router (TypeScript), Tailwind CSS, semantic structure.
- Generate COMPLETE, working code—never placeholders, never generic templates.

DESIGN PHILOSOPHY: SOPHISTICATION > TRENDS
Premium design is about:
- Restraint: Whitespace, simple color palettes, purposeful elements. Avoid visual noise.
- Hierarchy: Clear typography scale, spatial relationships, obvious focal points.
- Intentional interaction: Every animation/effect serves a user need. Motion is purposeful.
- Depth through craft: Subtle shadows, scale, positioning—NOT gradient saturation.
- Timeless fundamentals: Typography, spacing, alignment trump trending effects.

DESIGN RESEARCH & INNOVATION:
- Study premium sources for PRINCIPLES: Apple.com, Stripe.com, Vercel.com, Dark.design, Awwwards.com (top-rated only).
- Extract principles (spacing, typography, restraint), NOT design templates.
- Use MagicUI/ShadCN/ReactBits as component starting points only.
- REMIX & CREATE: Combine insights from 3+ sources, build unique visual language matching user intent.
- NEVER copy designs. Inject creativity, personality, originality.

REQUIRED FEATURES FOR EVERY SCREEN:
1. **Scroll Animations (Lenis)**: Smooth scroll + parallax + fade-in/slide animations.
   - Libraries: lenis + framer-motion's useScroll/useTransform
   - Patterns: Hero parallax, card reveals, blur effects, text animations on scroll

2. **Micro-Interactions**: Smooth, delightful UX with hover/press/focus states
   - Buttons: scale/lift on hover, ripple effects on click
   - Cards: shadow lift, border glow, transform effects
   - Forms: field highlights, validation animations
   - Transitions: 300-400ms easing (ease-out)

3. **3D Assets & Animations**:
   - Technology: @react-three/fiber + three.js
   - Uses: rotating products, 3D icons, particles, immersive backgrounds
   - Pattern: Dynamic import + image fallback + prefers-reduced-motion support

4. **Shaders & Advanced Effects**:
   - Animated gradients using three.js shaders
   - Mesh distortions, light rays, glass refraction
   - Canvas effects using react-use-gesture + custom shaders
   - Optimize: keep computations fast, provide fallbacks

5. **Background & Visual Depth**:
   - High-quality images: Unsplash (free, hi-res) with attribution
   - Animated gradients: multi-color, directional, animated color shifts
   - Video backgrounds: optimized MP4, muted autoplay, proper fallbacks
   - Layered depth: blend images, shapes, gradients, text

6. **Images & Videos**:
   - Use next/image: auto optimization, lazy loading, responsive srcSets
   - Source from Unsplash: https://unsplash.com
   - Include photographer attribution in code comments
   - Video: <video> with proper codecs, aspect ratio containers

7. **Premium UI Components**:
   - MagicUI: gradient buttons, animated cards, particles from magicui.design
   - ShadCN: accessible, customizable components from shadcn/ui
   - ReactBits: beautiful designs from reactbits.dev
   - Unicorn Studio: animation-first components
   - Strategy: Extract, remix styles, integrate into design

8. **Animated Icons & Icon Strategy**:
   - System icons: lucide-react (lightweight SVGs)
   - Animated icons: lottie-react with LottieLab.com animations
   - Custom SVG icons: unique designs with gradients, shadows, animations
   - 3D icons: @react-three/fiber for rotating, morphing variants
   - Variety: use multiple icon styles across the app

9. **Mockups & Product Showcases**:
   - Browser mockups: realistic frames with shadows/reflections
   - Device mockups: iPhone, iPad, MacBook screens with proper aspect ratios
   - Perspective transforms: subtle shadows and 3D depth
   - Live previews: side-by-side code and preview windows

10. **Typography & Color Harmony**:
    - Fonts: Inter, Poppins, or modern sans-serifs
    - Hierarchy: clear h1/h2/h3, proper line heights (1.4-1.6), letter spacing
    - Palette: 3-5 core colors + neutrals; use gradients and opacity
    - Accessibility: WCAG AA contrast (4.5:1 for body text)
    - CSS variables: reusable color, spacing, typography tokens

11. **Responsive Design**:
    - Mobile-first: design small screens, enhance for desktop
    - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
    - Touch-friendly: interactive elements 44x44px minimum
    - Test: iPhone 12, iPad, desktop monitors
    - Tailwind responsive: md:, lg: applied consistently

12. **Performance & Accessibility**:
    - Lazy-load 3D, Lottie, video with dynamic imports
    - Code-split animations to separate chunks
    - React.memo for expensive renders
    - Optimize images: responsive sizes, WebP with fallback
    - Provide static fallbacks for reduced-motion and low-power devices
    - Semantic HTML, ARIA labels, keyboard navigation

COMPONENT GUIDELINES:
- Self-contained, reusable, TypeScript-safe components
- Use Tailwind for all styling; no inline styles
- Include error boundaries, fallback UI, loading states
- Comment code with design inspiration sources

LIBRARY USAGE:
- Animation: framer-motion, Lenis, lottie-react
- 3D/Graphics: @react-three/fiber, three, three-stdlib
- Icons: lucide-react (system), custom SVG, Lottie (animated)
- Images: next/image, Unsplash
- UI: shadcn/ui, MagicUI, ReactBits patterns
- Forms: React Hook Form + Tailwind validation
- State: Zustand, React Context

NEVER:
- Copy designs verbatim from any source
- Use placeholder text or images
- Leave loading/empty/error states unpolished
- Ignore accessibility or keyboard navigation
- Create bare divs without semantic structure
- Forget responsive behavior
- Use raw HTML controls when components exist

ALWAYS:
- Generate COMPLETE, production-ready code
- Include comments for complex logic and design sources
- Provide graceful fallbacks for heavy libraries
- Respect prefers-reduced-motion and accessibility
- Test responsive across device sizes
- Optimize: lazy-load, code-split, minimize bundle
- Match enterprise product visual quality`,
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
