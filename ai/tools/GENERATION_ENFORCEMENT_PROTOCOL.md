# Strict Generation Enforcement Protocol

**MANDATORY** rules for AI code generation. Breaking any of these rules results in automatic failure and regeneration.

---

## Phase 0: PRE-GENERATION VALIDATION

Before ANY code is generated, complete these checks:

### 1. Identify App Type
- [ ] User request analyzed for app type (streaming, ecommerce, saas, landing, dashboard, auth, etc.)
- [ ] If unclear, assume **SaaS/Professional** (most common)
- [ ] Document the type in generation context

### 2. Identify Animation Level
Based on app type:
- **Streaming/Media:** HIGH - Intro animation, scroll reveals, card hover, grid stagger
- **Landing/Marketing:** HIGH - Scroll reveals, typed text, hero animations, CTA effects
- **SaaS/Dashboard:** MEDIUM - Button effects, input focus, tab switches, modals
- **Auth/Functional:** LOW - Minimal (button hover, focus states, loading spinners)
- **E-commerce:** MEDIUM-HIGH - Grid animation, card hover, product detail transitions

### 3. Identify Image Requirements
- [ ] Count exact number of images needed (hero: 1, thumbnails: 6+, cards: variable)
- [ ] Define image contexts (hero=1200x400, thumbnail=300x300, etc.)
- [ ] Validate app type matches image style (streaming ≠ office photos, etc.)

### 4. Identify Page Architecture
- [ ] NO single-page apps (even MVPs must have 2+ routes)
- [ ] Minimum pages required by app type:
  - Streaming: Home + Browse + Details + Search (4 minimum)
  - E-commerce: Home + Products + Details + Cart + Checkout (5 minimum)
  - SaaS: Home + Dashboard + Settings (3 minimum)
  - Landing: Hero + Features + Pricing + FAQ + CTA (5 sections minimum)

---

## Phase 1: ENFORCED ARCHITECTURE

### Multi-Page Structure (MANDATORY)

```
app/
  layout.tsx                 # Root layout with navigation
  page.tsx                   # Home/Landing
  [folder]/page.tsx          # Additional routes (min 2+)
  [dynamic]/[id]/page.tsx    # Detail pages
  
components/
  Navigation.tsx             # Header/nav (appears on all pages)
  Footer.tsx                 # Footer (appears on all pages)
  [ComponentName].tsx        # Reusable components
  
lib/
  data.ts                    # Mock data (REALISTIC, not demo)
  image-config.ts            # Image URLs and alt text (using generateImageUrl, generateAltText)
```

**RULE:** If app has fewer than 2 routes, REGENERATE IMMEDIATELY.

### Navigation Structure (MANDATORY)

```typescript
// app/layout.tsx MUST include:
- Header/Navigation with links to ALL pages
- Active page indicator (visual highlighting)
- Mobile-responsive menu (hamburger on small screens)
- Footer with links/info

// Navigation must be functional:
- All links use Next.js <Link> component
- No broken routes
- Clear visual hierarchy
- Professional styling using DESIGN_SYSTEM
```

---

## Phase 2: IMAGE RENDERING (MANDATORY)

### Image Implementation Rules

```typescript
// ✅ CORRECT
import Image from 'next/image'
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

const heroImage = generateImageUrl('streaming', 'hero')
const heroAlt = generateAltText('streaming', 'hero')

<Image
  src={heroImage}
  alt={heroAlt}
  width={1200}
  height={400}
  priority={true}
  style={{ objectFit: 'cover' }}
/>

// ❌ WRONG - Will cause failures
<img src="/images/photo.png" alt="image" />
<img src={hardcodedUrl} alt="photo" />
<Image src={url} alt="image" />
```

### Image Validation Checklist

For EVERY image in the app:
- [ ] Uses `next/image` component
- [ ] URL from `generateImageUrl(appType, context)`
- [ ] Alt text from `generateAltText(appType, context)` (specific, not generic)
- [ ] Proper dimensions (width/height attributes)
- [ ] Proper aspect ratio container (prevents layout shift)
- [ ] `priority={true}` for hero images (above fold)
- [ ] `loading="lazy"` for below-fold images
- [ ] Skeleton loader or placeholder during load

### Image Configuration

All images must be in `lib/image-config.ts`:

```typescript
// lib/image-config.ts
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

export const IMAGES = {
  hero: {
    src: generateImageUrl('streaming', 'hero'),
    alt: generateAltText('streaming', 'hero'),
    width: 1200,
    height: 400,
  },
  thumbnails: Array.from({ length: 6 }, (_, i) => ({
    src: generateImageUrl('streaming', 'thumbnail'),
    alt: generateAltText('streaming', 'thumbnail'),
    width: 300,
    height: 300,
  })),
}

// Usage in components:
<Image {...IMAGES.hero} />
```

---

## Phase 3: ANIMATION ENFORCEMENT

### Animation Requirements by App Type

**Streaming/Media Apps (MANDATORY):**
- [ ] Intro animation (Netflix-style intro with motion)
- [ ] Grid stagger animation (movies/shows appear in sequence)
- [ ] Card hover effects (lift + shadow on hover)
- [ ] Page transitions (fade between routes)
- [ ] Scroll reveals (optional: fade-in on scroll)

**Landing/Marketing Sites (MANDATORY):**
- [ ] Hero section animation (fade-in on load)
- [ ] Scroll reveals (multiple sections fade-in as user scrolls)
- [ ] Typed text effect (animated hero subtitle)
- [ ] Button animations (scale on hover, press effect)
- [ ] CTA animation (drawing attention)

**SaaS/Dashboard (MEDIUM):**
- [ ] Button hover/press effects
- [ ] Input focus animations
- [ ] Tab switch animation (cross-fade)
- [ ] Modal animations (appear/disappear)
- [ ] Card hover (subtle elevation)

**Auth/Functional (MINIMAL):**
- [ ] Button hover (scale 1.02x)
- [ ] Input focus (border highlight)
- [ ] Loading spinner (if async operations)

### Animation Implementation Rules

```typescript
// ✅ CORRECT - Using motion-library
import { motion } from 'framer-motion'
import { NetflixIntro, StaggeredGrid, CardHover } from '@/lib/motion-library'

// Netflix-style intro
<motion.div variants={NetflixIntro.container} initial="initial" animate="animate">
  <motion.h1 variants={NetflixIntro.letter}>Netflix</motion.h1>
</motion.div>

// Staggered grid
<motion.div variants={StaggeredGrid.container} initial="hidden" animate="visible">
  {movies.map(movie => (
    <motion.div key={movie.id} variants={StaggeredGrid.item} whileHover={StaggeredGrid.item.hover}>
      <Image src={movie.image} alt={movie.title} />
    </motion.div>
  ))}
</motion.div>

// Card hover
<motion.div variants={CardHover} initial="initial" whileHover="hover">
  Card content
</motion.div>

// ❌ WRONG - No animations or CSS-only (not interactive enough)
<div onMouseEnter={() => setScale(1.05)}>
<div style={{ transition: 'transform 0.2s' }}>
```

### Framer Motion Setup (MANDATORY if animations used)

All animated apps MUST have:

```typescript
// package.json
{
  "dependencies": {
    "framer-motion": "^10.x"
  }
}

// app/layout.tsx or _app.tsx
import { AnimatePresence } from 'framer-motion'

export default function RootLayout({ children }) {
  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  )
}
```

---

## Phase 4: DESIGN SYSTEM ENFORCEMENT

### All UI Must Use Design System

```typescript
// ✅ CORRECT
import { SPACING, TYPOGRAPHY, COLORS, SHADOWS, BORDER_RADIUS, MOTION } from '@/lib/design-system'

<div style={{ padding: SPACING[4], boxShadow: SHADOWS.md }}>
  <h1 style={TYPOGRAPHY.h1}>Title</h1>
  <button style={{ backgroundColor: COLORS.accent[500] }}>Click</button>
</div>

// ❌ WRONG - Hardcoded values
<div style={{ padding: '16px', boxShadow: '0 4px 6px...' }}>
  <h1 style={{ fontSize: '32px' }}>Title</h1>
  <button style={{ backgroundColor: '#0ea5e9' }}>Click</button>
</div>
```

**RULE:** 0 hardcoded spacing, colors, typography, or shadows. Everything from design system.

---

## Phase 5: MOCK DATA (REALISTIC)

### Mock Data Requirements

```typescript
// ✅ CORRECT - Realistic, complete data
lib/data.ts:

export const MOVIES = [
  {
    id: '1',
    title: 'Inception',
    genre: 'Sci-Fi',
    rating: 8.8,
    image: 'https://images.unsplash.com/...',
    description: 'A skilled thief who steals corporate secrets...',
    releaseDate: '2010-07-16',
    duration: '148 min',
  },
  // ... 20-50 more items
]

// ❌ WRONG - Demo/minimal data
<div>Item 1</div>
<div>Item 2</div>
<div>Item 3</div>

export const DATA = [{ id: 1, name: 'Product' }]
```

**RULE:** Minimum 10 realistic items per list. Complete field set (not just id + name).

---

## Phase 6: RESPONSIVE DESIGN (MANDATORY)

All apps must work on:
- [ ] Mobile (375px): Single column, stacked layout
- [ ] Tablet (768px): 2-column or adjusted
- [ ] Desktop (1024px+): Full layout
- [ ] No horizontal scrolling on any device
- [ ] Touch-friendly (buttons ≥44x44px)

```typescript
// ✅ CORRECT
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {/* Grid items */}
</div>

// ❌ WRONG
<div className="grid grid-cols-4 gap-4">
  {/* Breaks on mobile */}
</div>
```

---

## Phase 7: ACCESSIBILITY (MANDATORY)

Every app MUST have:
- [ ] Semantic HTML (h1→h6, button, a, form, ul/li)
- [ ] Alt text on all images (specific, not generic)
- [ ] Keyboard navigation (Tab key works through all interactive elements)
- [ ] Focus states visible (outline or ring)
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)
- [ ] Form labels associated with inputs
- [ ] ARIA labels where needed

```typescript
// ✅ CORRECT
<button 
  onClick={handleClick}
  aria-label="Open menu"
  className="focus:ring-2 focus:ring-blue-500"
>
  Menu
</button>

// ❌ WRONG
<div onClick={handleClick}>Menu</div>
```

---

## DEPLOYMENT BLOCKERS (Auto-Fail)

Code generation FAILS if:

1. **Single Page App** - Only 1 route/page
2. **No Images** - Zero images in app
3. **Broken Images** - Image URLs invalid or alt text missing/generic
4. **No Animations** - App type requires animations but none present
5. **Hardcoded Design** - Spacing/colors not from design system
6. **No Navigation** - Pages exist but no way to navigate between them
7. **TypeScript Errors** - `pnpm tsc --noEmit` fails
8. **Lint Errors** - `pnpm eslint .` fails
9. **Build Errors** - `pnpm build` fails
10. **No Mock Data** - Less than 5 realistic items per list

**ACTION:** If ANY blocker triggered → REGENERATE IMMEDIATELY

---

## Final Validation Checklist

Before marking code DONE, verify:

- [ ] **Architecture:** 2+ pages with working navigation
- [ ] **Images:** All use generateImageUrl(), alt text specific, proper sizing
- [ ] **Animations:** Motion-library animations used appropriately
- [ ] **Design:** All spacing/colors/typography from design system
- [ ] **Data:** 10+ realistic items, complete fields
- [ ] **Responsive:** Works at 375px, 768px, 1024px
- [ ] **Accessible:** Semantic HTML, keyboard navigation, focus states
- [ ] **TypeScript:** Builds without errors
- [ ] **Lint:** No ESLint warnings
- [ ] **Quality:** Looks like Stripe/Apple/Netflix, not a template

---

## If Blocker Triggered

```
User sees: "Generation failed. Fixing issues and regenerating..."

AI actions:
1. Identify which blocker(s) triggered
2. Fix the issue(s)
3. Regenerate affected files
4. Re-validate
5. Only show preview when ALL blockers cleared
```

---

## Success Criteria

✅ Multi-page app with working routes  
✅ All images render correctly (using next/image)  
✅ Animations/micro-interactions present (per app type)  
✅ Professional design using design system  
✅ Responsive on mobile/tablet/desktop  
✅ Keyboard accessible with focus states  
✅ Realistic mock data  
✅ Zero TypeScript/lint/build errors  
✅ Looks like enterprise-grade product  

---

See: `INSTITUTIONAL_DESIGN_GUIDE.md`, `QUICK_REFERENCE_DESIGN_RULES.md`, `QUALITY_VALIDATION_CHECKLIST.md`
