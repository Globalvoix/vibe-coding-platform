# Extract Design Tool

This tool enables the AI to fetch and extract premium design code, components, and inspiration from leading design resources and component libraries.

## Available APIs

### EXA API
- **Endpoint**: Search and research API for finding design inspiration sources
- **API Key**: Available via `EXA_API_KEY` environment variable
- **Use Cases**:
  - Search for UI components on magicui.design, shadcn/ui, shots.so
  - Find animated components, 3D effects, scroll animations
  - Discover design patterns from Awwwards.com, Dark.design
  - Research icon libraries (3dicons.co, LottieLab.com)
- **Example Searches**:
  - "magicui.design animated button component"
  - "shadcn/ui card component gradient"
  - "shots.so smooth scroll animation lenis"
  - "3dicons.co 3d icon library examples"

### Firecrawl API
- **Endpoint**: Web scraping and content extraction API
- **API Key**: Available via `FIRECRAWL_API_KEY` environment variable
- **Use Cases**:
  - Extract HTML/CSS code from design showcase pages
  - Retrieve component implementations and patterns
  - Get animation code snippets
  - Extract design system variables and tokens
  - Capture responsive behavior examples

## Integration Guidelines

1. **Search First (EXA)**: Query relevant design sources to find inspiration matching the user's intent.
2. **Extract Code (Firecrawl)**: Fetch the actual component code, styles, and patterns.
3. **Adapt & Remix**: Modify colors, typography, spacing, and structure to create a unique implementation.
4. **Vary Designs**: Never generate the same design twice; combine multiple sources and create variations.
5. **Respect Attribution**: Include comments crediting original design sources when appropriate.

## Premium Design Sources to Query

- **Component Libraries**: 21st.dev, reactbits.dev, magicui.design, shadcn/ui
- **Design Inspiration**: shots.so, Awwwards.com, Dark.design, unicorn.studio
- **Animation Resources**: LottieLab.com, framer.com/motion examples
- **3D & Advanced**: 3dicons.co, @react-three/fiber gallery
- **Scroll & Interaction**: lenis.darkroom.engineering, scroll-behavior examples
- **Icons**: lucide.dev (animated variants), custom SVG gradients

## Example Workflow

```
User Request: "Create a modern SaaS landing page"
↓
1. Use EXA to search: "magicui.design hero section modern" + "shadcn/ui feature grid"
2. Firecrawl extracts code from matching pages
3. Adapt: Remix hero with gradient, use extracted card patterns, customize colors
4. Add: Scroll animations (Lenis), animated icons, smooth transitions
5. Result: Unique premium landing page combining multiple inspirations
```

## Do NOT

- Copy designs verbatim without modification
- Use the same layout/color/animation twice
- Ignore user intent when extracting inspiration
- Forget to lazy-load heavy libraries (3D, Lottie, Lenis)
- Ignore accessibility (ARIA, semantic HTML, prefers-reduced-motion)

## Do

- Mix and remix designs to create unique outputs
- Adapt colors, typography, and spacing to user brand/intent
- Integrate advanced patterns (3D, shaders, glassmorphism, etc.)
- Always provide graceful fallbacks
- Comment code with source inspirations
- Vary approach across different user requests
