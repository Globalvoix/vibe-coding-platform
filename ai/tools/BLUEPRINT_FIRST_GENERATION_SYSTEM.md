# Blueprint-First Generation System

**Problem**: AI generates code too fast, skipping design validation, image verification, and library imports.

**Solution**: Enforce a mandatory BLUEPRINT PHASE before any code is written. The AI must think through every detail before generating a single line of code.

---

## Phase 1: BLUEPRINT (Mandatory - Before Code Generation)

### 1.1 App Type Analysis
Identify the app type from the user request. Map to one of:
- `streaming` (Netflix, Disney+, YouTube)
- `ecommerce` (Shopify, Amazon)
- `saas` (Linear, Notion, Slack)
- `dashboard` (analytics, admin panels)
- `auth` (login, signup flows)
- `calculator` (functional tools)
- `blog` (article publishing)
- `portfolio` (creative showcase)
- `landing` (marketing/product launch)
- `social` (communities, messaging)
- `music` (Spotify, Apple Music)
- `news` (journalism, media)
- `banking` (fintech, payment)
- `real-estate` (property listings)

### 1.2 Image Audit
Before writing ANY code, decide on EVERY image:
- Where will images appear? (hero, thumbnail, card, background, accent)
- What Unsplash search terms will work? (Use `image-helper.ts` for app type)
- What are exact image URLs? (Use `generateImageUrl(appType, context)`)
- What is specific alt text? (Use `generateAltText(appType, context)`)

**DO NOT skip this step.** Verify every image URL is valid before including in code.

Example Blueprint:
```
Images needed:
1. Hero banner (hero context)
   - Search term: "cinema"
   - URL: generateImageUrl('streaming', 'hero')
   - Alt: generateAltText('streaming', 'hero')
   - Size: 1200x400px
   
2. Movie card (card context)
   - Search term: "movie stills"
   - URL: generateImageUrl('streaming', 'card')
   - Alt: generateAltText('streaming', 'card')
   - Size: 400x300px
```

### 1.3 Animation Mapping
Decide which animations are needed by app type:

| App Type | Required Animations | Library |
|----------|-------------------|---------|
| Streaming | Netflix intro + grid stagger + card hover | framer-motion |
| Landing | Scroll reveals + typed text + button effects | framer-motion |
| E-commerce | Grid stagger + card hover + button press | framer-motion |
| SaaS | Button hover + input focus + tab switch | framer-motion |
| Dashboard | Card hover + button effects + transitions | framer-motion |
| Auth | Button hover + input focus + form feedback | framer-motion |
| Functional | Button hover + loading spinner | (CSS only) |

### 1.4 Component Structure
Plan the MULTI-PAGE architecture BEFORE coding:
- What are the routes? (e.g., Home, Details, Search, Profile)
- How many pages minimum? (depends on app type)
- What navigation connects them?
- What data/props do components need?

**BLOCKER**: If fewer than 2 routes → FAIL generation.

### 1.5 Library Dependencies
List ALL libraries needed:
- `framer-motion` (if animations required)
- `lucide-react` (if icons needed)
- `next/image` (for all images)
- Other: date-fns, react-query, etc.

Create package.json update with ALL dependencies.

### 1.6 Data Model
Define mock data structure:
- What entities exist? (products, movies, users, etc.)
- What fields does each have?
- How many items minimum? (10+)
- Where will data.ts live?

---

## Phase 2: VALIDATE (Check Blueprint)

Before writing code, verify:

- [ ] App type identified
- [ ] All images have exact URLs (from `generateImageUrl()`)
- [ ] All images have specific alt text (from `generateAltText()`)
- [ ] Animation patterns mapped (and libraries listed)
- [ ] Multi-page structure planned (minimum 2 routes)
- [ ] Navigation plan clear (how pages link)
- [ ] All dependencies listed
- [ ] Data model defined
- [ ] No generic alt text ("image", "photo", "picture")
- [ ] No hardcoded image paths

If ANY of these is missing → STOP and complete blueprint.

---

## Phase 3: GENERATE CODE (Only After Blueprint Complete)

### 3.1 File Generation Order
1. **lib/data.ts** - Mock data (10+ items, structured)
2. **lib/image-config.ts** - Image URLs & alt text (from blueprint)
3. **package.json** - Dependencies (framer-motion, lucide-react, etc.)
4. **Utility files** - Design system, animations, helpers
5. **Component files** - Individual page/component files
6. **Route files** - All page routes (2+ minimum)
7. **.env.local** - Environment variables

### 3.2 Implementation Rules

**For Images (MANDATORY)**:
```typescript
// ALWAYS use next/image
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

**For Animations (App Type Dependent)**:
```typescript
// MUST use framer-motion for streaming, landing, ecommerce, saas, dashboard, social
import { motion } from 'framer-motion'
import { NetflixIntro, StaggeredGrid, CardHover } from '@/lib/motion-library'

// Netflix streaming app MUST have intro
<motion.div
  variants={NetflixIntro.container}
  initial="initial"
  animate="animate"
>
  <motion.h1 variants={NetflixIntro.letter}>Netflix</motion.h1>
</motion.div>
```

**For Layout**:
```typescript
// ALWAYS use design system spacing
import { SPACING, TYPOGRAPHY, SHADOWS } from '@/lib/design-system'

<div style={{ padding: SPACING.6, gap: SPACING.4 }}>
  {/* Content */}
</div>
```

---

## Phase 4: VALIDATION BLOCKERS (Auto-Fail If Triggered)

If ANY of these are true → REGENERATE IMMEDIATELY:

1. **Single Page App** - Less than 2 routes
2. **<img> tag used** - Any image uses `<img>` instead of `next/image`
3. **Generic Alt Text** - Any alt text is "image", "photo", "picture", "screenshot"
4. **Hardcoded URLs** - Any image URL is hardcoded, not from `generateImageUrl()`
5. **Missing Animations** - App type requires animations but none present
6. **Broken Links** - Routes don't link properly (broken navigation)
7. **TypeScript Errors** - Any type errors or explicit `any` types
8. **Lint Errors** - Any ESLint violations
9. **Missing Imports** - Used library not imported (framer-motion, lucide-react, etc.)
10. **Missing Dependencies** - package.json doesn't list used libraries

---

## Phase 5: QUALITY CHECKLIST (Before Finalizing)

Every generated app MUST pass:

- [ ] 2+ routes with working navigation
- [ ] All images use `next/image` with specific alt text
- [ ] All images from `generateImageUrl()` (no hardcoded URLs)
- [ ] Animations present for required app types
- [ ] Design system spacing (no hardcoded `padding: '20px'`)
- [ ] Typography uses TYPOGRAPHY scale
- [ ] 10+ realistic mock data items in lib/data.ts
- [ ] Responsive design (tested at 375px, 768px, 1280px)
- [ ] Zero TypeScript errors (pnpm tsc --noEmit)
- [ ] Zero lint errors (pnpm eslint)
- [ ] Zero build errors (pnpm build)
- [ ] Looks like enterprise UI (not template)

---

## Example: Streaming App Blueprint

```
## BLUEPRINT PHASE

### App Type
Streaming platform (like Netflix)

### Images
1. Hero banner: Netflix intro cinematic scene
   - generateImageUrl('streaming', 'hero')
   - generateAltText('streaming', 'hero')
   
2. Movie cards (8 minimum): Film stills/posters
   - generateImageUrl('streaming', 'card')
   - generateAltText('streaming', 'card')

3. Background: Dark cinematic
   - generateImageUrl('streaming', 'background')
   - generateAltText('streaming', 'background')

### Animations
- Netflix intro: 0.6s container fade + 0.8s letter scale
- Grid stagger: 5ms delay between cards
- Card hover: 8px lift + shadow increase
- Page transitions: 0.3s fade

### Libraries
- framer-motion (for Netflix intro + stagger + card hover)
- next/image (all images)
- lucide-react (menu icons)

### Routes
1. /pages/index.tsx (Home - hero + featured section + movie grid)
2. /pages/movie/[id].tsx (Details - movie info + rating + recommendations)

### Data Model
```typescript
interface Movie {
  id: string
  title: string
  description: string
  image: string
  rating: number
  year: number
  genre: string[]
  duration: number
}

// 12 mock movies in lib/data.ts
```

### Navigation
- Home → Featured movie row → Click card → Details page
- Details page → Back to Home link
- Header on all pages with Home link
```

---

## Checklist for AI Generators

**BEFORE YOU WRITE CODE:**
- [ ] Did you identify the app type?
- [ ] Did you plan EVERY image (URL, alt text, dimensions)?
- [ ] Did you map animations by app type?
- [ ] Did you plan 2+ routes?
- [ ] Did you define mock data structure?
- [ ] Did you list ALL dependencies?

**IF YOU CANNOT ANSWER YES TO ALL** → STOP AND COMPLETE THE BLUEPRINT.

**WHILE CODING:**
- [ ] Using `next/image` for all images?
- [ ] Using `generateImageUrl()` and `generateAltText()`?
- [ ] Using `framer-motion` for required animations?
- [ ] Using design system spacing/typography/colors?
- [ ] Creating multi-page routes (not single page)?
- [ ] Importing all libraries in package.json?

**AFTER CODING:**
- [ ] Does it have 2+ routes?
- [ ] Do all routes work? (no broken links)
- [ ] Are all images rendering? (check DevTools)
- [ ] Are animations working?
- [ ] Zero TypeScript errors?
- [ ] Zero lint errors?
- [ ] Looks like Stripe/Apple/Netflix (not a template)?

---

## Summary: The Three Rules

1. **BLUEPRINT FIRST**: Plan everything (images, animations, structure) before code
2. **VALIDATE ALWAYS**: Check every image URL, alt text, library import
3. **FAIL FAST**: Use blockers to catch single-page apps, generic alt text, missing libraries

**Result**: Institutional-grade frontend with perfect images, smooth animations, and working multi-page flows—every time.
