# Design Extraction API Integration Guide

This guide shows how to use EXA and Firecrawl APIs to extract design inspiration and implementation patterns for generating authentic, domain-specific applications.

## Overview

When generating domain-specific applications (e-commerce, SaaS, clones), use these APIs to:
1. **Find** premium design examples matching the app type
2. **Extract** working code, layouts, and patterns
3. **Adapt** and remix into unique implementations

---

## EXA API - DESIGN DISCOVERY

### Purpose
Search across the web for premium design examples, components, and patterns specific to app types.

### Available APIs
- **API Key**: `EXA_API_KEY` environment variable
- **Endpoint**: Exa search API for web content discovery

### Search Strategies by App Type

#### E-COMMERCE STORE SEARCHES
```
Primary Searches:
  1. "21st.dev product card component"
  2. "reactbits.dev product grid component"
  3. "magicui.design product card component examples"
  4. "shadcn/ui ecommerce product grid template"
  5. "shots.so clothing store hero section design"
  6. "awwwards.com ecommerce design 2024"

Secondary Searches:
  5. "shopify theme product gallery layout"
  6. "stripe.com checkout flow design patterns"
  7. "product page design best practices"
  8. "shopping cart interface patterns"

Specific Verticals:
  - "premium fashion brand website design"
  - "luxury ecommerce hero section"
  - "apparel store navigation menu"
  - "product listing filter sidebar"
  - "wishlist heart icon interactions"
```

#### SAAS/DASHBOARD SEARCHES
```
Primary Searches:
  1. "magicui.design hero section saas examples"
  2. "shadcn/ui dashboard layout components"
  3. "shots.so saas landing page design"
  4. "vercel.com pricing table design"

Secondary Searches:
  5. "stripe.com feature section layout"
  6. "pricing page comparison table design"
  7. "saas testimonial carousel component"
  8. "dashboard mockup browser frame"

Specific Features:
  - "feature grid 3 column layout"
  - "trust badges and social proof"
  - "free trial cta button design"
  - "pricing tier highlight/popular plan"
  - "customer logo carousel"
```

#### WEB APP CLONE SEARCHES
```
Generic Searches:
  1. "[app name] UI design breakdown"
  2. "[app name] component library"
  3. "[app name] figma design file"
  4. "recreate [app name] ui tutorial"

Specific App Searches:
  - "Twitter/X clone UI design"
  - "Figma interface layout recreation"
  - "Notion-like note app design"
  - "Slack clone messaging interface"
  - "Discord server layout design"

Inspiration Searches:
  - "dark.design minimalist dashboard"
  - "awwwards.com design patterns"
  - "dribbble high-quality ui components"
```

#### DESIGN SYSTEM / COMPONENT SEARCHES
```
General Searches:
  1. "magicui.design animated button hover effects"
  2. "shadcn/ui form input component"
  3. "framer-motion scroll animation examples"
  4. "lenis smooth scroll implementation"

Icon & Animation Searches:
  5. "lucide-react icon examples"
  6. "3dicons.co 3d icon library"
  7. "LottieLab.com animated icon library"
  8. "gradient text css examples"
```

### Usage Pattern

```javascript
// Pseudocode for EXA API usage
const searchResults = await exa.search({
  query: "magicui.design product card component",
  numResults: 10,
  type: "auto", // Can be "organic", "news", "pdf", "auto"
  livecrawl: "fallback", // Ensure fresh results
})

// Process results
searchResults.results.forEach(result => {
  console.log(result.title)
  console.log(result.url)
  console.log(result.text) // Content preview
})
```

### Key Tips
- **Be specific**: "magicui.design hero section" → better than "hero section"
- **Include source sites**: "shots.so" + "magicui.design" narrow results to quality sources
- **Search multiple times**: Try 2-3 different queries to find varied inspirations
- **Scan results for diversity**: Pick inspirations from different sources/styles
- **Note the URLs**: Feed URLs to Firecrawl for code extraction

---

## FIRECRAWL API - CODE EXTRACTION

### Purpose
Extract HTML, CSS, and JavaScript code from design pages and components.

### Available APIs
- **API Key**: `FIRECRAWL_API_KEY` environment variable
- **Endpoint**: Web scraping and content extraction

### Extraction Strategies

#### Extract HTML/CSS from Component Pages
```javascript
// Extract from magicui.design product card
const response = await firecrawl.scrapeUrl({
  url: "https://magicui.design/docs/components/product-card",
  formats: ["html", "markdown"],
  onlyMainContent: false,
})

// Returns full HTML + CSS for the component
const html = response.content
const css = response.styles
```

#### Extract from Design Showcase Pages
```javascript
// Get full page HTML from design example
const response = await firecrawl.scrapeUrl({
  url: "https://shots.so/search?q=ecommerce+hero",
  waitForSelectors: [".design-card", ".preview-section"],
})

// Extract images, layout, component structure
```

#### Extract Design System Documentation
```javascript
// Get color palettes, spacing scales, typography from design docs
const response = await firecrawl.scrapeUrl({
  url: "https://example.com/design-system",
  formats: ["markdown"],
})

// Extract CSS custom properties, color definitions, etc.
```

### Usage Pattern

```javascript
// Step 1: Search for design examples (EXA)
const searches = [
  "magicui.design product gallery",
  "shots.so ecommerce hero",
  "shadcn/ui card component"
]

for (const query of searches) {
  const results = await exa.search({query, numResults: 5})
  
  // Step 2: Extract code from top results (Firecrawl)
  for (const result of results.results.slice(0, 2)) {
    const extracted = await firecrawl.scrapeUrl({
      url: result.url,
      formats: ["html", "markdown"]
    })
    
    // Step 3: Store extracted code for adaptation
    designInspiration.push({
      source: result.url,
      html: extracted.content,
      title: result.title
    })
  }
}

// Step 4: Adapt and remix into unique implementation
const uniqueImplementation = adaptAndMix(designInspiration)
```

### Key Tips
- **Wait for selectors**: Ensure dynamic content loads before extraction
- **Get markdown format**: Easier to parse and adapt than raw HTML
- **Extract multiple sources**: 2-3 extractions provide better variation
- **Note the source URLs**: Include as comments in generated code (attribution)
- **Clean up extracted code**: Remove unnecessary elements, adapt class names

---

## ADAPTATION WORKFLOW

### Step 1: Analyze Extracted Designs
```
For each extracted design, note:
- Color scheme (primary, secondary, neutrals)
- Typography (font families, sizes, weights)
- Spacing patterns (margins, paddings, gaps)
- Component structure (cards, grids, buttons)
- Interaction patterns (hover, transitions)
- Responsive breakpoints and approach
```

### Step 2: Identify Unique Aspects
```
Look for:
- What makes this design work well?
- How does it communicate the app's purpose?
- What can be improved or varied?
- Which patterns are essential vs. nice-to-have?
```

### Step 3: Remix Into Original Design
```
Create a unique design by:
1. Combining layout from source A
2. Color scheme from source B
3. Typography pairing from source C
4. Custom interactions specific to user intent
5. Varying component composition (don't duplicate)
6. Adapting for user's brand/requirements
```

### Step 4: Implement with Modern Stack
```
- Use Next.js + Tailwind CSS
- Leverage shadcn/ui or magicui components as starting points
- Add framer-motion animations
- Include Lenis for smooth scroll (if applicable)
- Ensure accessibility (WCAG AA minimum)
- Responsive design mobile-first
```

---

## EXAMPLE: E-COMMERCE STORE GENERATION

### Request
"Create an e-commerce store for a sustainable fashion brand called 'EcoVibe'"

### Step 1: Intent Detection
- App Type: E-COMMERCE (keywords: store, fashion brand)
- Primary Pattern: E-COMMERCE ARCHITECTURE
- Vertical: Sustainable Fashion

### Step 2: Design Research (EXA)
```
Search 1: "magicui.design product card component"
Search 2: "shots.so sustainable fashion store hero"
Search 3: "shadcn/ui shopping cart checkout flow"
```

### Step 3: Code Extraction (Firecrawl)
```
Extract 1: magicui product card HTML + CSS
Extract 2: SussFashion.com hero section layout
Extract 3: shadcn product grid responsive pattern
```

### Step 4: Design Analysis
```
Color Analysis:
  - EcoVibe brand: Green (#10b981) + Natural off-white (#fafaf8)
  - Inspiration 1: Blue + Gray (adapt to green)
  - Inspiration 2: Brown + Cream (adapt to green)
  → Final: Green accent + cream/white + dark gray text

Typography:
  - Inspiration 1: Inter (sans-serif) for body
  - Inspiration 2: Playfair Display (serif) for headlines
  → Final: Combine: Playfair for h1/h2, Inter for body

Layout:
  - Product grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
  - Hero: Full-width image + overlay with CTA
  - Header: Minimal sticky nav with green accent
  - Filters: Sidebar on desktop, modal on mobile
```

### Step 5: Implement
```tsx
// components/ProductCard.tsx (adapted from magicui)
// - Green accent instead of blue
// - Sustainable product badges
// - "Add to Cart" + Wishlist actions
// - Rating + review count

// components/HeroSection.tsx
// - Large sustainable fashion hero image
// - "Discover Our Collections" CTA
// - Sustainability trust signal

// components/Navigation.tsx
// - EcoVibe logo
// - Categories: Women, Men, Accessories
// - Search bar
// - Cart + Account

// components/Footer.tsx
// - Newsletter signup with sustainability message
// - Impact stats (plastic saved, etc.)
// - Links to values/about
```

### Step 6: Review
- ✅ Looks like an e-commerce store
- ✅ Colors match sustainable brand identity
- ✅ Essential patterns included
- ✅ Responsive design thoughtful
- ✅ Interactions smooth and purposeful
- ✅ Unique design (not templated)

---

## EXAMPLE: SAAS LANDING PAGE GENERATION

### Request
"Build a SaaS dashboard for remote teams to manage projects"

### Step 1: Intent Detection
- App Type: SAAS (keywords: SaaS, dashboard, manage projects)
- Primary Pattern: SAAS/BUSINESS DASHBOARD
- Target User: Remote teams (distributed, async-first)

### Step 2: Design Research (EXA)
```
Search 1: "magicui.design hero section productivity app"
Search 2: "shots.so project management dashboard design"
Search 3: "vercel.com pricing table design patterns"
```

### Step 3: Code Extraction (Firecrawl)
```
Extract 1: magicui hero with dual CTA buttons
Extract 2: Productivity app dashboard screenshot
Extract 3: Pricing comparison table with 3 tiers
```

### Step 4: Design Analysis
```
Color Scheme:
  - Primary: Deep purple (#7c3aed) (innovation, trust)
  - Secondary: Cyan (#06b6d4) (action, clarity)
  - Neutrals: Grays (#1f2937, #f3f4f6)

Typography:
  - Headlines: Bold, large (4xl-6xl for hero, 2xl-3xl for sections)
  - Body: Clean sans-serif, good line-height (1.6)
  - Emphasis: Semi-bold for feature titles

Layout Structure:
  - Sticky nav with brand + navigation + CTA
  - Hero: Problem headline, benefit subheading, 2 CTAs
  - Mockup: Browser screenshot showing dashboard
  - Features: 3 columns (Collaborate, Automate, Analyze)
  - Testimonials: Customer quotes + logos
  - Pricing: 3 tiers (Starter, Professional, Enterprise)
  - Final CTA: Strong call to action with trust signal
```

### Step 5: Implement
```tsx
// components/Navigation.tsx
// - Logo + Features/Pricing/Docs/Blog links + Sign In + Get Started

// components/HeroSection.tsx
// - "Manage projects faster. Ship on time."
// - "Everything your remote team needs to ship great work"
// - "Start 14-Day Free Trial" (primary) + "Watch Demo" (secondary)
// - Trust badges: "No credit card required", "Setup in 5 minutes"

// components/DashboardMockup.tsx
// - Browser frame showing actual dashboard
// - Floating card: "30% faster project completion"

// components/FeaturesSection.tsx
// - 3 cards: Collaboration, Automation, Analytics
// - Icons + benefit-focused copy

// components/SocialProof.tsx
// - Company logos: "Trusted by 5,000+ teams"
// - 3 testimonial cards

// components/PricingSection.tsx
// - 3 pricing tiers with features
// - Popular tier (Professional) highlighted with ring + shadow

// components/FinalCTA.tsx
// - "Ready to ship faster?"
// - Primary CTA button
// - Subtext about trial
```

### Step 6: Review
- ✅ Looks professional and trustworthy (SAAS aesthetic)
- ✅ Problem-focused messaging
- ✅ Clear value proposition
- ✅ Social proof and trust signals present
- ✅ Pricing transparent and clear
- ✅ Responsive and accessible
- ✅ Unique design (not generic SAAS template)

---

## API Environment Variables

Ensure these are set in the environment:

```bash
EXA_API_KEY="your-exa-api-key"
FIRECRAWL_API_KEY="your-firecrawl-api-key"
```

These are available in the platform and should be automatically configured for AI agents.

---

## Best Practices

### DO
✅ Search multiple times for design inspiration
✅ Extract code from 2-3 different sources
✅ Adapt and remix (don't copy)
✅ Include source URLs as comments in code
✅ Vary designs across different requests
✅ Follow responsive design patterns
✅ Combine multiple inspirations into something unique
✅ Test extracted code patterns before adapting
✅ Respect original design authors

### DO NOT
❌ Copy designs verbatim without adaptation
❌ Extract from only one source
❌ Use same layout/colors/components multiple times
❌ Forget to adapt to user's brand/intent
❌ Ignore accessibility in extracted code
❌ Use generic placeholder content
❌ Skip responsive design considerations
❌ Extract and deploy copyrighted designs directly
❌ Forget to provide fallbacks for images/external content

---

## Troubleshooting

**Issue: Search results not relevant**
→ Be more specific with keywords. Include source sites ("magicui.design", "shots.so", "awwwards.com")

**Issue: Firecrawl extraction incomplete**
→ Use `waitForSelectors` to ensure JavaScript-rendered content loads
→ Try `onlyMainContent: false` for full page content

**Issue: Extracted code has broken styling**
→ Clean up class names and ensure they match generated CSS
→ Extract CSS separately if needed

**Issue: Design feels templated**
→ Mix inspirations from different sources more aggressively
→ Change colors, typography, and spacing from defaults
→ Vary component composition and layout order

---

## Summary

The design extraction workflow:
1. **Detect intent** (e-commerce, SaaS, clone, etc.)
2. **Search** for premium examples (EXA API)
3. **Extract** code and patterns (Firecrawl API)
4. **Analyze** inspiration designs
5. **Adapt** patterns into unique implementation
6. **Review** for authenticity and quality

This ensures generated applications look and feel authentic to their purpose, not like generic templates.
