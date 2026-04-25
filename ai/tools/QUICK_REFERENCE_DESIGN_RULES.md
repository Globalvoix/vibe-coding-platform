# Quick Reference: Design & Quality Rules

**TL;DR** - Rules to follow when generating frontend code.

---

## 1. Spacing (4px/8px Grid)

```typescript
// ✅ RIGHT
import { SPACING } from '@/lib/design-system'

<div style={{ padding: SPACING[4] }}>          // 16px
<div style={{ marginBottom: SPACING[6] }}>     // 24px
<div style={{ gap: SPACING[3] }}>              // 12px

// ❌ WRONG
<div style={{ padding: '15px' }}>
<div style={{ marginBottom: '20px' }}>
<div style={{ gap: '10px' }}>
```

**Quick Map:**
- `SPACING[1]` = 4px
- `SPACING[2]` = 8px
- `SPACING[3]` = 12px
- `SPACING[4]` = 16px (default padding)
- `SPACING[5]` = 20px
- `SPACING[6]` = 24px (section padding)
- `SPACING[8]` = 32px (large sections)
- `SPACING[12]` = 48px (hero sections)

---

## 2. Typography (Professional Scale)

```typescript
// ✅ RIGHT
import { TYPOGRAPHY } from '@/lib/design-system'

<h1 style={TYPOGRAPHY.displayLg}>Hero Title</h1>     // 56px
<h2 style={TYPOGRAPHY.h2}>Section</h2>              // 24px
<p style={TYPOGRAPHY.body}>Regular text</p>         // 16px
<small style={TYPOGRAPHY.labelSm}>Label</small>     // 12px

// ❌ WRONG
<h1 style={{ fontSize: '50px' }}>
<p style={{ fontSize: '18px' }}>
<small style={{ fontSize: '10px' }}>
```

**Quick Map:**
- Hero: `displayLg` (56px), `displayMd` (44px)
- Headings: `h1` (32px), `h2` (24px), `h3` (20px)
- Body: `body` (16px), `bodySm` (14px)
- Labels: `labelMd` (14px), `labelSm` (12px)

---

## 3. Images (Contextually Relevant)

```typescript
// ✅ RIGHT
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

const heroImg = generateImageUrl('streaming', 'hero')
const heroAlt = generateAltText('streaming', 'hero')

<img src={heroImg} alt={heroAlt} width={1200} height={400} />

// ❌ WRONG
<img src="/images/photo.png" alt="image" />
<img src="https://random.com/pic.jpg" alt="photo" />
<img src={generateImageUrl('streaming', 'hero')} alt="image" />
```

**App Types:** `streaming`, `ecommerce`, `saas`, `dashboard`, `auth`, `calculator`, `blog`, `portfolio`, `landing`, `social`, `music`, `news`, `banking`, `real-estate`

**Contexts:** `hero`, `thumbnail`, `card`, `product`, `background`, `avatar`, `accent`

---

## 4. Colors (Minimal Palette)

```typescript
// ✅ RIGHT
import { COLORS } from '@/lib/design-system'

<button style={{ backgroundColor: COLORS.accent[500] }}>Click</button>
<p style={{ color: COLORS.gray[700] }}>Text</p>
<div style={{ color: COLORS.success }}>Success!</div>

// ❌ WRONG
<button style={{ backgroundColor: '#0ea5e9' }}>Click</button>
<p style={{ color: '#3f3f46' }}>Text</p>
<div style={{ color: 'green' }}>Success!</div>
```

**Never use:** 5+ colors, random hex values, hardcoded colors.

---

## 5. Shadows (Elevation)

```typescript
// ✅ RIGHT
import { SHADOWS } from '@/lib/design-system'

<div style={{ boxShadow: SHADOWS.sm }}>Light card</div>
<div style={{ boxShadow: SHADOWS.md }}>Normal card</div>
<div style={{ boxShadow: SHADOWS.lg }}>Elevated card</div>

// ❌ WRONG
<div style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
```

**Scale:** `xs`, `sm`, `md`, `lg`, `xl`, `2xl`

---

## 6. Border Radius (Subtle)

```typescript
// ✅ RIGHT
import { BORDER_RADIUS } from '@/lib/design-system'

<button style={{ borderRadius: BORDER_RADIUS.md }}>Click</button>      // 4px
<div style={{ borderRadius: BORDER_RADIUS.lg }}>Card</div>             // 8px
<img style={{ borderRadius: BORDER_RADIUS.xl }} src="..." />           // 12px

// ❌ WRONG
<button style={{ borderRadius: '6px' }}>
<div style={{ borderRadius: '10px' }}>
```

**Scale:** `sm` (2px), `md` (4px), `lg` (8px), `xl` (12px), `full` (9999px)

---

## 7. Motion & Transitions

```typescript
// ✅ RIGHT
import { MOTION } from '@/lib/design-system'

<div style={{ transition: MOTION.default }}>
<div style={{ transition: MOTION.colorChange }}>
<button style={{ transition: MOTION.scaleHover }}>

// ❌ WRONG
<div style={{ transition: '0.3s' }}>
<button style={{ transition: 'all 0.5s linear' }}>
```

**Durations:** `fast` (100ms), `normal` (200ms), `slow` (300ms), `slower` (500ms)

---

## 8. Form & Components

```typescript
// ✅ Button
<button
  style={{
    padding: `${SPACING[2]} ${SPACING[4]}`,     // 8px 16px
    backgroundColor: COLORS.accent[500],
    borderRadius: BORDER_RADIUS.md,             // 4px
    boxShadow: SHADOWS.sm,
    transition: MOTION.default,
  }}
>
  Click me
</button>

// ✅ Input
<input
  style={{
    padding: `${SPACING[2]} ${SPACING[3]}`,     // 8px 12px
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.gray[300]}`,
  }}
/>

// ✅ Card
<div
  style={{
    padding: SPACING[4],                        // 16px
    borderRadius: BORDER_RADIUS.lg,             // 8px
    boxShadow: SHADOWS.md,
  }}
>
  Card content
</div>
```

---

## 9. Layout & Responsive

```typescript
// ✅ Desktop-first responsive
<div className="grid grid-cols-3 gap-4 md:grid-cols-2 sm:grid-cols-1">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>

// ✅ Container with padding
<section style={{ padding: SPACING[6], maxWidth: '1200px', margin: '0 auto' }}>
  Content
</section>

// ❌ WRONG
<div style={{ display: 'flex', gap: '15px', padding: '20px' }}>
```

**Tailwind Breakpoints:** `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

---

## 10. Alt Text (Specific, Not Generic)

```typescript
// ✅ RIGHT
<img alt="Cinematic film scene showcasing dramatic storytelling" />
<img alt="Professional office workspace with modern monitors" />
<img alt="Product display with color variations" />

// ❌ WRONG
<img alt="image" />
<img alt="photo" />
<img alt="picture" />
<img alt="screenshot" />
```

**Use generateAltText()** from `lib/image-helper` for auto-generated specific alt text.

---

## 11. No Hardcoded Values

```typescript
// ❌ NEVER DO THIS
const padding = '15px'           // Why not use SPACING?
const fontSize = '20px'          // Why not use TYPOGRAPHY?
const color = '#3f3f46'          // Why not use COLORS?
const borderRadius = '6px'       // Why not use BORDER_RADIUS?
const boxShadow = '0 2px 4px...' // Why not use SHADOWS?
const duration = '0.3s'          // Why not use MOTION?

// ✅ ALWAYS USE SYSTEM
import { SPACING, TYPOGRAPHY, COLORS, ... } from '@/lib/design-system'
```

---

## 12. Multi-Page, Not Single Page

```typescript
// ✅ RIGHT: Full app router structure
app/
  layout.tsx
  page.tsx           // Home
  browse/page.tsx    // Browse
  search/page.tsx    // Search
  details/[id]/page.tsx  // Details
  profile/page.tsx   // Profile

// ❌ WRONG
pages/
  index.tsx  // Everything in one page with fake routing
```

---

## 13. Validation Checklist

Before marking code DONE:

- [ ] All spacing from `SPACING`
- [ ] All typography from `TYPOGRAPHY`
- [ ] All colors from `COLORS`
- [ ] All shadows from `SHADOWS`
- [ ] All border radius from `BORDER_RADIUS`
- [ ] All transitions from `MOTION`
- [ ] All images from `generateImageUrl()`
- [ ] All alt text from `generateAltText()` (or specific)
- [ ] No hardcoded: pixels, colors, font sizes, shadows
- [ ] Responsive on: mobile (375px), tablet (768px), desktop (1024px+)
- [ ] All interactive elements have focus/hover states
- [ ] Builds without TypeScript or lint errors
- [ ] Multiple pages/routes (not single-page)
- [ ] Realistic mock data (not 3-item demo)
- [ ] No console errors or warnings

---

## 14. Imports Cheat Sheet

```typescript
// Design System
import { SPACING, TYPOGRAPHY, COLORS, SHADOWS, BORDER_RADIUS, MOTION, GRID } from '@/lib/design-system'

// Images
import { generateImageUrl, generateAltText, getUnsplashSearchTerms } from '@/lib/image-helper'

// Validation (for testing)
import { validateAsset, validateAssets, generateAuditReport } from '@/lib/asset-validation'
```

---

## 15. Common Patterns

### Hero Section
```typescript
<section style={{ paddingTop: SPACING[12], paddingBottom: SPACING[8] }}>
  <img src={generateImageUrl(appType, 'hero')} alt={generateAltText(appType, 'hero')} />
  <h1 style={TYPOGRAPHY.displayLg}>Title</h1>
  <p style={TYPOGRAPHY.body}>Subtitle</p>
</section>
```

### Card Grid
```typescript
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING[4] }}>
  {items.map(item => (
    <div key={item.id} style={{ padding: SPACING[4], boxShadow: SHADOWS.md, borderRadius: BORDER_RADIUS.lg }}>
      <img src={generateImageUrl(appType, 'card')} alt={generateAltText(appType, 'card')} />
      <h3 style={TYPOGRAPHY.h3}>{item.title}</h3>
      <p style={TYPOGRAPHY.bodySm}>{item.description}</p>
    </div>
  ))}
</div>
```

### Button with States
```typescript
<button
  style={{
    padding: `${SPACING[2]} ${SPACING[4]}`,
    backgroundColor: COLORS.accent[500],
    borderRadius: BORDER_RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    transition: MOTION.default,
  }}
  onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.accent[600]}
  onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.accent[500]}
>
  Click Me
</button>
```

---

## Remember

1. **No hardcoded values** - Everything from design system
2. **Images matter** - Use generateImageUrl(), never random URLs
3. **Multi-page** - Real architecture, not MVPs
4. **Responsive** - Mobile-first, works at all sizes
5. **Accessible** - Keyboard navigation, focus states, semantic HTML
6. **Consistent** - Same spacing, typography, colors throughout
7. **Professional** - Looks like Stripe/Apple/Linear, not a template

---

**See full docs:** `INSTITUTIONAL_DESIGN_GUIDE.md`  
**Quality checklist:** `QUALITY_VALIDATION_CHECKLIST.md`
