# Blueprint-First Generation Quick Start

This guide helps AI generators create institutional-grade frontends by enforcing a methodical, blueprint-first approach.

---

## The Problem

**Old Way (❌ Problematic)**:
1. Read user request → Generate code immediately
2. Rush through implementation
3. Missing images (URLs don't work)
4. Missing library imports
5. No animations
6. Generic alt text

**New Way (✅ Correct)**:
1. **STOP & THINK**: Analyze user request
2. **BLUEPRINT**: Plan everything in detail
3. **VALIDATE**: Check all images, libraries, routes
4. **GENERATE**: Only then write code
5. **VERIFY**: Ensure code passes all blockers

---

## Phase 1: BLUEPRINT (Do This First!)

### Step 1.1: Identify App Type

Map user request to ONE of these:
- `streaming` (Netflix, Disney+)
- `ecommerce` (Shopify, Amazon)
- `saas` (Linear, Notion, Slack)
- `dashboard` (Admin panels, analytics)
- `auth` (Login, signup)
- `calculator` (Functional tools)
- `blog` (Articles)
- `portfolio` (Creative showcase)
- `landing` (Marketing pages)
- `social` (Communities)
- `music` (Spotify)
- `news` (Journalism)
- `banking` (Finance, payments)
- `real-estate` (Property)

**Example**:
```
User: "I want a Netflix clone"
App Type: streaming
```

### Step 1.2: Plan Every Image

For EACH image in the app, specify:
1. Where it appears (context: hero, card, thumbnail, background, accent)
2. Search term for Unsplash
3. Exact function call: `generateImageUrl(appType, context)`
4. Exact alt text function: `generateAltText(appType, context)`
5. Pixel dimensions

**Example**:
```
IMAGE 1: Hero Banner
- Context: hero
- Search: "cinema"
- URL: generateImageUrl('streaming', 'hero')
- Alt: generateAltText('streaming', 'hero')
- Size: 1200x400px

IMAGE 2: Movie Cards (8 total)
- Context: card
- Search: "movie stills"
- URL: generateImageUrl('streaming', 'card')
- Alt: generateAltText('streaming', 'card')
- Size: 400x300px
```

**BLOCKER**: If you can't specify exact images → STOP and plan them first.

### Step 1.3: Map Animations

List animations needed by app type (use lib/motion-library.ts):

```
App Type: streaming
Animations:
1. NetflixIntro (0.6s fade + scale)
2. StaggeredGrid (5ms stagger, 0.4s duration)
3. CardHover (8px lift + shadow)
4. PageTransition (0.3s fade)

Library: framer-motion
```

**Quick Reference**:
- **streaming**: NetflixIntro + StaggeredGrid + CardHover + PageTransition
- **ecommerce**: StaggeredGrid + CardHover + ButtonPress + Toast
- **saas**: ButtonPress + InputFocus + TabSwitch + Modal + ScrollReveal
- **dashboard**: CardHover + ButtonPress + TabSwitch
- **landing**: ScrollReveal + TypedText + ButtonPress + CardHover
- **blog**: ScrollReveal + ImageZoom
- **Other**: At least ButtonPress

**BLOCKER**: If app type requires animations but you didn't list them → FAIL.

### Step 1.4: Plan Routes (Multi-Page)

Specify MINIMUM 2 routes (exceptions: calculator, landing):

```
Streaming App Routes:
- /pages (home, featured section, movie grid)
- /pages/details/[id] (movie info, rating, recommendations)
```

**Minimum by Type**:
- streaming: 2 routes
- ecommerce: 3+ routes
- saas: 3 routes
- landing: 1 page (exception) OR 5+ sections
- calculator: 1 page (exception)
- blog: 2+ routes
- portfolio: 2+ routes
- social: 2+ routes

**BLOCKER**: Single-page app (less than 2 routes) → FAIL.

### Step 1.5: List Libraries

Specify ALL libraries:

```
Required:
- framer-motion (animations)
- next/image (all images)
- lucide-react (icons)

Optional:
- date-fns (date formatting)
```

### Step 1.6: Define Data Model

Sketch mock data in lib/data.ts:

```typescript
interface Movie {
  id: string
  title: string
  description: string
  rating: number
  year: number
  genre: string[]
  duration: number
}

// Minimum: 10 movies
```

---

## Phase 2: VALIDATE Blueprint

Before writing code, check all:
- [ ] App type identified
- [ ] All images planned (URL + alt text)
- [ ] Animations mapped
- [ ] 2+ routes planned (or exception)
- [ ] Libraries listed
- [ ] Data model defined
- [ ] No generic alt text
- [ ] No hardcoded URLs

**If NOT ALL checked** → Go back to Phase 1.

---

## Phase 3: GENERATE Code

### Order (Important!):
1. lib/data.ts (mock data)
2. package.json (dependencies)
3. lib/image-config.ts (images)
4. app/layout.tsx (root layout)
5. app/pages/page.tsx (home)
6. app/pages/[detail]/page.tsx (details)
7. Components

### Patterns to Follow

**Image Pattern** (MANDATORY):
```typescript
import Image from 'next/image'
import { generateImageUrl, generateAltText } from '@/lib/image-helper'

const heroUrl = generateImageUrl('streaming', 'hero')
const heroAlt = generateAltText('streaming', 'hero')

<Image
  src={heroUrl}
  alt={heroAlt}
  width={1200}
  height={400}
  priority
  style={{ objectFit: 'cover' }}
/>
```

**Animation Pattern**:
```typescript
import { motion } from 'framer-motion'
import { NetflixIntro, StaggeredGrid } from '@/lib/motion-library'

// Intro
<motion.div variants={NetflixIntro.container} initial="initial" animate="animate">
  <motion.h1 variants={NetflixIntro.letter}>Netflix</motion.h1>
</motion.div>

// Grid
<motion.div variants={StaggeredGrid.container} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={StaggeredGrid.item}>
      {/* Item */}
    </motion.div>
  ))}
</motion.div>
```

**Spacing Pattern**:
```typescript
import { SPACING, TYPOGRAPHY } from '@/lib/design-system'

<div style={{ padding: SPACING.6, gap: SPACING.4 }}>
  <h1 style={TYPOGRAPHY.h1}>Heading</h1>
</div>
```

### File Order for Streaming App Example

```
1. lib/data.ts
   - Define Movie interface
   - Create 12 mock movies
   
2. package.json
   - Add: framer-motion, lucide-react, next/image
   
3. lib/image-config.ts
   - Import generateImageUrl, generateAltText
   - Export IMAGES object with hero, card, background
   
4. app/layout.tsx
   - Import AnimatePresence from framer-motion
   - Wrap with AnimatePresence
   - Add header with navigation
   
5. app/page.tsx (Home)
   - Hero section with NetflixIntro animation
   - Featured section (first 4 movies)
   - Main grid with StaggeredGrid (all movies)
   - Each card has CardHover animation
   - Link to details page
   
6. app/details/[id]/page.tsx
   - Movie info
   - Recommendations (4 similar movies)
   - Back to home link
```

---

## Phase 4: VALIDATION BLOCKERS

❌ **FAIL & REGENERATE IF**:
1. Single page app (< 2 routes)
2. Uses `<img>` instead of `<Image>`
3. Generic alt text ("image", "photo", "picture", "screenshot")
4. Hardcoded image URLs
5. Missing animations for required type
6. Broken navigation (links don't work)
7. Missing library imports
8. Missing package.json dependencies
9. TypeScript errors
10. Lint errors

---

## Phase 5: FINAL CHECKLIST

Before delivering, verify:
- [ ] 2+ routes with working navigation
- [ ] All images use generateImageUrl()
- [ ] All images have specific alt text
- [ ] All images use `next/image` component
- [ ] Animations present and working
- [ ] Design system spacing used
- [ ] 10+ mock data items
- [ ] framer-motion in package.json
- [ ] lucide-react in package.json
- [ ] next/image imported
- [ ] Zero TypeScript errors
- [ ] Zero lint errors
- [ ] Looks like enterprise UI

---

## Common Mistakes & Fixes

### ❌ Mistake 1: Hardcoding Image URL

```typescript
// WRONG
<img src="https://images.unsplash.com/photo-xyz" alt="movie" />

// CORRECT
import { generateImageUrl, generateAltText } from '@/lib/image-helper'
<Image
  src={generateImageUrl('streaming', 'hero')}
  alt={generateAltText('streaming', 'hero')}
  width={1200}
  height={400}
/>
```

### ❌ Mistake 2: Generic Alt Text

```typescript
// WRONG
alt="image"
alt="photo"
alt="screenshot"

// CORRECT
alt={generateAltText('streaming', 'hero')}
// Returns: "Cinematic film scene showcasing dramatic storytelling"
```

### ❌ Mistake 3: Single Page

```typescript
// WRONG (one route)
- /pages (home + details in modal)

// CORRECT (two routes)
- /pages (home)
- /pages/details/[id] (details page)
```

### ❌ Mistake 4: Missing Animations

```typescript
// WRONG (streaming app with no animations)
<div>{movies.map(m => <div key={m.id}>{m.title}</div>)}</div>

// CORRECT (uses StaggeredGrid)
import { StaggeredGrid } from '@/lib/motion-library'
<motion.div variants={StaggeredGrid.container} initial="hidden" animate="visible">
  {movies.map(m => (
    <motion.div key={m.id} variants={StaggeredGrid.item}>
      {m.title}
    </motion.div>
  ))}
</motion.div>
```

### ❌ Mistake 5: Missing framer-motion Import

```typescript
// WRONG (using motion without import)
<motion.div>...</motion.div> // motion is undefined!

// CORRECT
import { motion } from 'framer-motion'
<motion.div>...</motion.div>
```

---

## Key Principles

1. **SLOW DOWN**: Blueprint first, code second
2. **PLAN IMAGES**: Never hardcode URLs or generic alt text
3. **MULTI-PAGE**: Always 2+ routes (except calculator/landing)
4. **ANIMATIONS**: Every app type needs motion
5. **LIBRARIES**: framer-motion + lucide-react + next/image
6. **VALIDATION**: Check before finalizing
7. **DESIGN SYSTEM**: Use SPACING, TYPOGRAPHY, SHADOWS tokens

---

## Use These Files

- `lib/image-helper.ts` - generateImageUrl(), generateAltText()
- `lib/motion-library.ts` - NetflixIntro, StaggeredGrid, etc.
- `lib/design-system.ts` - SPACING, TYPOGRAPHY, SHADOWS
- `lib/app-intelligence.ts` - analyzeAppRequest(), getRequiredAnimations()
- `lib/library-validation.ts` - validatePackageJson(), auditCodeImports()
- `lib/image-url-validator.ts` - validateUnsplashUrlFormat()

---

## Summary

**BLUEPRINT PHASE** (5-10 minutes):
1. Identify app type
2. Plan all images (URL + alt)
3. Map animations
4. Plan 2+ routes
5. List libraries
6. Define data model

**VALIDATE** (2 minutes):
- All checklist items complete?

**GENERATE** (15-20 minutes):
- Follow patterns
- Use helper functions
- Maintain order

**VERIFY** (5 minutes):
- Check blockers
- Run validation
- Pass final checklist

---

**Result**: Institutional-grade frontend with perfect images, smooth animations, working multi-page flows—every time.
