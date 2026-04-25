# Institutional Design System & Asset Validation Guide

This guide explains how to generate world-class frontends that look like **Apple, Stripe, Linear, Netflix, Neon, Clerk**, etc.

## Overview

We have implemented three critical systems:

1. **Design System** (`lib/design-system.ts`) - Enforces consistent spacing, typography, and component styling
2. **Asset Validation** (`lib/asset-validation.ts`) - Ensures all images are contextually relevant and high-quality
3. **Image Helper** (`lib/image-helper.ts`) - Generates correct image URLs and alt text based on app type

---

## Part 1: Design System Usage

### Import the Design System

```typescript
import {
  SPACING,
  TYPOGRAPHY,
  GRID,
  SHADOWS,
  COLORS,
  BORDER_RADIUS,
  MOTION,
  ASPECT_RATIOS,
} from '@/lib/design-system'
```

### Spacing (4px/8px Grid)

**ALWAYS use spacing from the scale:**

```typescript
// ❌ WRONG - Hardcoded values
<div style={{ padding: '15px', marginBottom: '25px' }}>
  Content
</div>

// ✅ RIGHT - Use SPACING constants
<div className={`p-${SPACING[3]} mb-${SPACING[5]}`}>
  Content
</div>

// Or in Tailwind (recommended):
<div className="p-3 mb-5">
  Content
</div>
```

**Spacing scale:**
- `SPACING[1]` = 4px
- `SPACING[2]` = 8px
- `SPACING[3]` = 12px
- `SPACING[4]` = 16px (default padding)
- `SPACING[6]` = 24px (section padding)
- `SPACING[8]` = 32px (large sections)
- `SPACING[12]` = 48px (hero sections)

### Typography (Professional Scale)

**Use the typography scale for all text:**

```typescript
// Hero Headline
<h1 style={TYPOGRAPHY.displayLg}>
  Welcome to our app
</h1>

// Section Title
<h2 style={TYPOGRAPHY.h2}>
  Features
</h2>

// Body Text
<p style={TYPOGRAPHY.body}>
  This is regular body text.
</p>

// Small Label
<span style={TYPOGRAPHY.labelSm}>
  Optional field
</span>
```

**Typography hierarchy:**
- `displayLg` - 56px (hero headlines)
- `displayMd` - 44px (page titles)
- `h1` - 32px (main heading)
- `h2` - 24px (section heading)
- `h3` - 20px (subsection)
- `body` - 16px (regular text)
- `bodySm` - 14px (smaller text)
- `labelMd` - 14px (button/label text)
- `labelSm` - 12px (small labels)
- `caption` - 12px (captions)

### Shadows (Elevation)

**Use shadows for depth:**

```typescript
// Card with subtle shadow
<div style={{ boxShadow: SHADOWS.md }}>
  Card content
</div>

// Hover elevation
<div
  style={{
    boxShadow: SHADOWS.sm,
    transition: MOTION.shadowChange,
  }}
  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = SHADOWS.lg)}
>
  Hoverable card
</div>
```

**Shadow scale:**
- `xs` - Subtle, delicate
- `sm` - Light shadow for cards
- `md` - Medium elevation (default card)
- `lg` - More prominent
- `xl` - Heavy, dialog-like elevation
- `2xl` - Maximum depth

### Motion & Transitions

**Keep animations minimal and purposeful:**

```typescript
// Smooth color transition
<div
  style={{
    backgroundColor: '#0ea5e9',
    transition: MOTION.colorChange,
  }}
>
  Smooth color change
</div>

// Scale on hover (200ms)
<button
  style={{
    transition: MOTION.scaleHover,
  }}
  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
>
  Hover to scale
</button>

// Common durations:
// MOTION.fast = 100ms (quick feedback)
// MOTION.normal = 200ms (default)
// MOTION.slow = 300ms (reveals)
// MOTION.slower = 500ms (important transitions)
```

### Colors (Minimal Palette)

```typescript
// Use the professional color system
import { COLORS } from '@/lib/design-system'

// Primary action
<button style={{ backgroundColor: COLORS.accent[500] }}>
  Click me
</button>

// Text
<p style={{ color: COLORS.gray[700] }}>
  Regular text
</p>

// Hover state
<button
  style={{ backgroundColor: COLORS.accent[600] }}
  onMouseEnter={(e) =>
    (e.currentTarget.style.backgroundColor = COLORS.accent[700])
  }
>
  Hover button
</button>

// Semantic colors
<div style={{ color: COLORS.success }}>Success!</div>
<div style={{ color: COLORS.error }}>Error message</div>
<div style={{ color: COLORS.warning }}>Warning</div>
```

**Color philosophy:** Use 1-2 accent colors + grayscale neutrals. NO color chaos.

### Border Radius (Subtle)

```typescript
// Card with subtle radius
<div style={{ borderRadius: BORDER_RADIUS.lg }}>
  Card
</div>

// Button
<button style={{ borderRadius: BORDER_RADIUS.md }}>
  Click me
</button>

// Radius scale:
// BORDER_RADIUS.sm = 2px (minimal)
// BORDER_RADIUS.md = 4px (inputs, buttons)
// BORDER_RADIUS.lg = 8px (cards)
// BORDER_RADIUS.xl = 12px (larger cards)
// BORDER_RADIUS.full = 9999px (pills, avatars)
```

### Grid System

```typescript
// Responsive container
<div style={{ maxWidth: GRID.container.desktop.maxWidth }}>
  <div style={{ display: 'grid', gap: GRID.gap.md, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
    {/* Grid items */}
  </div>
</div>

// Breakpoints for responsive design:
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
// 2xl: 1536px
```

---

## Part 2: Image & Asset Validation

### Why Image Validation Matters

**Bad examples that should NEVER happen:**
- ❌ Shoes in a Netflix clone
- ❌ Pizza in a banking app
- ❌ Office photo in a gaming app
- ❌ Generic placeholder images

**Good examples:**
- ✅ Cinematic film scenes in streaming app
- ✅ Product photos in ecommerce
- ✅ Charts and graphs in dashboard
- ✅ Secure technology imagery in auth pages

### Image Generation Workflow

1. **Identify app type** from user request
2. **Use generateImageUrl()** to get contextually accurate Unsplash URLs
3. **Use generateAltText()** for specific, descriptive alt text
4. **Never hardcode image paths** from unverified sources

### Example: Streaming App

```typescript
import {
  generateImageUrl,
  generateAltText,
  getUnsplashSearchTerms,
} from '@/lib/image-helper'

const appType = 'streaming'

// Hero image
const heroImage = generateImageUrl(appType, 'hero')
// Returns: Unsplash URL with search for "cinema", "film noir", "movie scenes"

const heroAlt = generateAltText(appType, 'hero')
// Returns: "Cinematic film scene showcasing dramatic storytelling"

// Thumbnail for movie card
const thumbImage = generateImageUrl(appType, 'thumbnail')
const thumbAlt = generateAltText(appType, 'thumbnail')

// Component
<div>
  <img
    src={heroImage}
    alt={heroAlt}
    width={1200}
    height={400}
    style={{ objectFit: 'cover' }}
  />

  <div className="grid grid-cols-3 gap-4">
    {movies.map((movie) => (
      <div key={movie.id}>
        <img
          src={thumbImage}
          alt={thumbAlt}
          width={300}
          height={300}
        />
      </div>
    ))}
  </div>
</div>
```

### App Types and Image Contexts

Each app type has specific image requirements:

**Streaming:** Cinematic, film scenes, posters
```typescript
generateImageUrl('streaming', 'hero') // movie cinema scenes
generateImageUrl('streaming', 'thumbnail') // movie posters
```

**E-commerce:** Products, shopping, retail
```typescript
generateImageUrl('ecommerce', 'hero') // storefront, market
generateImageUrl('ecommerce', 'product') // product displays
```

**SaaS:** Technology, workspace, professional
```typescript
generateImageUrl('saas', 'hero') // office workspace, tech
generateImageUrl('saas', 'card') // laptop, monitor, workspace
```

**Dashboard:** Charts, analytics, data
```typescript
generateImageUrl('dashboard', 'hero') // analytics, metrics
generateImageUrl('dashboard', 'card') // data, charts
```

**Auth:** Security, trust, protection
```typescript
generateImageUrl('auth', 'hero') // security, protection
generateImageUrl('auth', 'card') // trust, professional
```

**[See lib/image-helper.ts for all 14 app types]**

### Image Validation Utility

```typescript
import {
  validateAsset,
  validateAssets,
  generateAuditReport,
} from '@/lib/asset-validation'

const assets = [
  {
    url: 'https://images.unsplash.com/photo-...',
    alt: 'Cinematic film scene',
    width: 1200,
    height: 400,
    context: 'hero' as const,
    appType: 'streaming' as const,
  },
]

const results = validateAssets(assets)
// Returns: { [url]: { isValid: boolean, errors: [], warnings: [] } }

// Generate audit report
const report = generateAuditReport(results)
console.log(report)
```

**Validation checks:**
- ✅ Image from approved source (Unsplash, Pexels, etc.)
- ✅ No forbidden patterns for app type
- ✅ Proper dimensions for context
- ✅ Valid URL format
- ✅ Descriptive alt text (not generic)

---

## Part 3: Putting It All Together

### Complete Example: E-Commerce App

```typescript
import { SPACING, TYPOGRAPHY, SHADOWS, GRID } from '@/lib/design-system'
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

export default function ProductShowcase() {
  const appType = 'ecommerce'

  const heroImage = generateImageUrl(appType, 'hero')
  const heroAlt = generateAltText(appType, 'hero')

  const products = [
    { id: 1, name: 'Product 1' },
    { id: 2, name: 'Product 2' },
    { id: 3, name: 'Product 3' },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          paddingTop: SPACING[12],
          paddingBottom: SPACING[12],
          paddingLeft: SPACING[4],
          paddingRight: SPACING[4],
        }}
      >
        <img
          src={heroImage}
          alt={heroAlt}
          width={1200}
          height={400}
          style={{
            borderRadius: '8px',
            objectFit: 'cover',
            marginBottom: SPACING[8],
          }}
        />

        <h1 style={TYPOGRAPHY.displayLg}>Shop Our Collection</h1>
        <p style={{ ...TYPOGRAPHY.bodySm, color: '#71717a', marginTop: SPACING[3] }}>
          Curated products for your lifestyle
        </p>
      </section>

      {/* Product Grid */}
      <section
        style={{
          paddingLeft: SPACING[4],
          paddingRight: SPACING[4],
          paddingBottom: SPACING[12],
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: SPACING[6],
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                boxShadow: SHADOWS.md,
                borderRadius: '8px',
                padding: SPACING[4],
                transition: 'box-shadow 200ms ease-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = SHADOWS.lg)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = SHADOWS.md)}
            >
              <img
                src={generateImageUrl(appType, 'product')}
                alt={generateAltText(appType, 'product')}
                width={300}
                height={300}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  marginBottom: SPACING[3],
                }}
              />
              <h3 style={TYPOGRAPHY.h3}>{product.name}</h3>
              <p style={{ ...TYPOGRAPHY.body, color: '#71717a' }}>$99.00</p>
              <button
                style={{
                  marginTop: SPACING[3],
                  padding: `${SPACING[2]} ${SPACING[4]}`,
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  borderRadius: BORDER_RADIUS.md,
                  border: 'none',
                  cursor: 'pointer',
                  transition: MOTION.default,
                }}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

---

## Key Principles

1. **Never hardcode** spacing, colors, or typography
2. **Always use generateImageUrl()** for any image in the app
3. **Always use generateAltText()** for descriptive alt text
4. **Import and use** SPACING, TYPOGRAPHY, SHADOWS from design system
5. **Verify** every image matches the app type niche
6. **Use Tailwind** with design system values for consistency
7. **Include skeleton loaders** or fallback UI for images
8. **Test responsive** design on mobile (375px), tablet (768px), desktop (1280px)

---

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Right |
|---------|---------|
| `padding: '15px'` | `p-3` or `SPACING[3]` |
| `font-size: '18px'` | `TYPOGRAPHY.h4` or `text-lg` |
| `box-shadow: '0 2px 4px...'` | `SHADOWS.sm` |
| Generic "photo.png" | Result of `generateImageUrl()` |
| Alt text: "image" | Result of `generateAltText()` |
| 5+ accent colors | 1-2 colors + grayscale |
| Lots of animations | Minimal, purposeful motion |
| Single page MVP | Full multi-page architecture |

---

## Resources

- **Design System:** `lib/design-system.ts`
- **Asset Validation:** `lib/asset-validation.ts`
- **Image Helper:** `lib/image-helper.ts`
- **Next Config:** Updated with Unsplash, Pexels, Pixabay domains

---

## Quality Checklist (Before Finalizing)

- [ ] All spacing uses SPACING constants
- [ ] All typography uses TYPOGRAPHY scale
- [ ] All colors use COLORS or CSS variables
- [ ] All images use generateImageUrl()
- [ ] All alt text uses generateAltText() (specific, not generic)
- [ ] Shadows use SHADOWS scale
- [ ] Border radius uses BORDER_RADIUS
- [ ] Motion uses MOTION constants
- [ ] Interactive elements have focus/hover states
- [ ] Responsive breakpoints use Tailwind prefixes
- [ ] No hardcoded values for spacing/colors/typography
- [ ] Image URLs are from approved sources (Unsplash, Pexels, etc.)
- [ ] No out-of-niche images (shoes in streaming, pizza in banking, etc.)

---

## Questions?

Check the implementation files:
- `lib/design-system.ts` - Full design system reference
- `lib/image-helper.ts` - Image generation for all app types
- `lib/asset-validation.ts` - Validation logic and forbidden patterns
