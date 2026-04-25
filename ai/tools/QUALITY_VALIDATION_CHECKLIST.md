# Quality Validation Checklist

Use this checklist when generating frontends to ensure institutional-grade quality before marking code as complete.

## Phase 1: Design System Compliance

### Spacing Validation
- [ ] All padding values use `SPACING` constants (SPACING[2], SPACING[4], SPACING[6], etc.)
- [ ] No hardcoded pixel values like `padding: "15px"` or `margin: "20px"`
- [ ] Grid gaps use `SPACING` or Tailwind `gap-*` classes (gap-3, gap-4, gap-6)
- [ ] Section padding uses `SPACING[6]` (24px) or `SPACING[12]` (48px) minimum
- [ ] Component internal padding uses appropriate size (buttons: SPACING[2], cards: SPACING[4])

### Typography Validation
- [ ] Display/hero headlines use `TYPOGRAPHY.displayLg` or `TYPOGRAPHY.displayMd`
- [ ] Page titles use `TYPOGRAPHY.h1` or `TYPOGRAPHY.h2`
- [ ] Section headings use `TYPOGRAPHY.h2` or `TYPOGRAPHY.h3`
- [ ] Body text uses `TYPOGRAPHY.body` (16px)
- [ ] Small text uses `TYPOGRAPHY.bodySm` or `TYPOGRAPHY.labelSm`
- [ ] No arbitrary font sizes like `fontSize: "18px"` or `className="text-lg"`
- [ ] Line heights are appropriate (1.6 for body, 1.25 for headings)

### Color Validation
- [ ] Primary accent color uses `COLORS.accent[500]` or similar
- [ ] Neutral backgrounds use `COLORS.gray` scale
- [ ] No more than 2 accent colors in entire app
- [ ] Semantic colors used correctly (success: green, error: red, warning: yellow)
- [ ] All colors either from `COLORS` or CSS variables, never hardcoded hex/rgb

### Shadow & Elevation
- [ ] Card shadows use `SHADOWS.md` or appropriate scale
- [ ] Hover elevation increases to `SHADOWS.lg`
- [ ] No custom shadow values like `boxShadow: "0 2px 4px..."`
- [ ] Shadow transitions use `MOTION.shadowChange`

### Border Radius
- [ ] Inputs/buttons use `BORDER_RADIUS.md` (4px)
- [ ] Cards use `BORDER_RADIUS.lg` (8px)
- [ ] Large sections use `BORDER_RADIUS.xl` (12px)
- [ ] No arbitrary radius values

### Motion & Animation
- [ ] Transitions use `MOTION` constants (100ms, 200ms, 300ms)
- [ ] Hover effects use `MOTION.scaleHover` or appropriate easing
- [ ] Color changes use `MOTION.colorChange`
- [ ] All transitions have proper easing function
- [ ] No animations > 500ms unless specifically for scroll reveals
- [ ] Animations respect `prefers-reduced-motion`

---

## Phase 2: Image & Asset Validation

### Image URL Validation
- [ ] Every image uses `generateImageUrl(appType, context)` from `lib/image-helper`
- [ ] No hardcoded image paths like `/images/photo.png`
- [ ] No external URLs from unknown sources
- [ ] Images only from approved domains:
  - [ ] images.unsplash.com
  - [ ] images.pexels.com
  - [ ] cdn.pixabay.com
  - [ ] imagedelivery.net (Cloudflare)
  - [ ] cdn.builder.io

### Alt Text Validation
- [ ] Every `<img>` has an `alt` attribute
- [ ] Alt text uses `generateAltText(appType, context)` from `lib/image-helper`
- [ ] Alt text is specific and descriptive (NOT "image", "photo", "picture", "screenshot")
- [ ] Examples of CORRECT alt text:
  - ✅ "Cinematic film scene showcasing dramatic storytelling"
  - ✅ "Professional office workspace with modern monitors"
  - ✅ "Product display with color variations"
- [ ] Examples of WRONG alt text:
  - ❌ "image"
  - ❌ "photo"
  - ❌ "screenshot"
  - ❌ "image description"

### Image Context Validation
- [ ] Hero images: 1200x400px minimum, `context: 'hero'`
- [ ] Thumbnails: 300x200px minimum, `context: 'thumbnail'`
- [ ] Product images: 400x400px minimum, `context: 'product'`
- [ ] Avatars: 64x64px minimum, `context: 'avatar'`
- [ ] Background images: 1920x1080px, `context: 'background'`

### App Type Relevance
For each image, verify it matches the app type:
- [ ] **Streaming:** Cinematic, film scenes, dramatic lighting, actors, posters
  - ❌ NOT: shoes, pizza, office, shopping
- [ ] **E-commerce:** Products, shopping, storefront, retail, merchandise
  - ❌ NOT: office, corporate, business, formal
- [ ] **SaaS:** Technology, workspace, interface, charts, analytics
  - ❌ NOT: parties, celebrations, intimate, casual
- [ ] **Dashboard:** Charts, graphs, analytics, data, metrics
  - ❌ NOT: beach, vacation, art, entertainment
- [ ] **Auth:** Security, protection, trust, professional, locks
  - ❌ NOT: gaming, funny, meme, cartoon
- [ ] **Banking:** Finance, money, security, investment, transactions
  - ❌ NOT: casual, party, entertaining, playful
- [ ] **Real Estate:** Property, home, interior, architecture, building
  - ❌ NOT: people, faces, portraits, crowds

### Image Technical Validation
- [ ] All image URLs are valid and return 200 status
- [ ] Images use proper aspect ratio containers (no layout shift)
- [ ] High-resolution images (min 500x375px for thumbnails)
- [ ] Images use `next/image` component with proper props:
  ```typescript
  <Image
    src={imageUrl}
    alt={altText}
    width={width}
    height={height}
    priority={isAboveTheFold}
    loading={isAboveTheFold ? 'eager' : 'lazy'}
  />
  ```
- [ ] Skeleton loaders or fallback UI for images during loading
- [ ] Proper `object-fit` (cover, contain, etc.) for images

---

## Phase 3: Component & Layout Quality

### Interactive Elements
- [ ] All buttons have hover state (visual feedback)
- [ ] All buttons have focus state (accessibility)
- [ ] All buttons have active/pressed state
- [ ] All form inputs have focus states
- [ ] All links have hover state
- [ ] All interactive elements are keyboard accessible
- [ ] Touch targets are minimum 44x44px

### Layout & Spacing
- [ ] No overlapping elements (unless intentional design)
- [ ] Consistent left/right padding (not mixed SPACING values)
- [ ] Grid gaps are consistent throughout component
- [ ] Card padding is consistent (usually SPACING[4])
- [ ] Section spacing is consistent (usually SPACING[8] or SPACING[12])
- [ ] Whitespace is abundant and breathing (not cramped)

### Responsive Design
- [ ] Mobile layout (375px): Stacked/single column
- [ ] Tablet layout (768px): 2-column or adjusted
- [ ] Desktop layout (1024px+): Full multi-column
- [ ] All breakpoints use Tailwind prefixes: `sm:`, `md:`, `lg:`, `xl:`
- [ ] Images scale responsively with proper aspect ratios
- [ ] Text is readable on all screen sizes
- [ ] Touch interactions work on mobile (no :hover only)
- [ ] No horizontal scrolling on mobile

### Component Consistency
- [ ] All buttons use same style/spacing/typography
- [ ] All cards have same padding and shadow
- [ ] All headers use consistent typography hierarchy
- [ ] All sections have consistent spacing
- [ ] All form inputs styled consistently
- [ ] No "one-off" components with unique styling

---

## Phase 4: Content & Data Quality

### Mock Data
- [ ] Mock data is realistic for app type
- [ ] At least 5-10 items for any list/grid (not 3-4 demo items)
- [ ] Data structure matches database schema
- [ ] Mock data includes all required fields
- [ ] Empty states handled (what if no data?)
- [ ] Error states handled (what if error?)
- [ ] Loading states handled (skeleton loaders, spinners)

### Text Content
- [ ] No placeholder text ("Lorem ipsum", "Item 1", "Product 1")
- [ ] Copy is contextually appropriate for app type
- [ ] No grammatical errors or typos
- [ ] Headings and labels are clear and descriptive
- [ ] Call-to-action buttons have clear action text

### Navigation
- [ ] All routes work without errors
- [ ] Navigation items are highlighted/active on current route
- [ ] Back navigation works properly
- [ ] URLs are clean and RESTful
- [ ] No broken links or missing pages

---

## Phase 5: Accessibility (WCAG AA Minimum)

### Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Large text contrast ratio ≥ 3:1
- [ ] Color is not the only way to convey information
- [ ] Focus indicators have sufficient contrast

### Keyboard & Navigation
- [ ] All interactive elements accessible via keyboard
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] Focus visible on all focusable elements
- [ ] No keyboard traps (can tab out of all components)
- [ ] Keyboard shortcuts documented if used

### Semantic HTML
- [ ] Proper heading hierarchy (h1, h2, h3, not skipped)
- [ ] Lists use `<ul>`, `<ol>`, `<li>` (not divs)
- [ ] Buttons use `<button>` (not `<div>`)
- [ ] Links use `<a>` (not divs with click handlers)
- [ ] Form inputs have labels
- [ ] Images have alt text

### ARIA & Labels
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons have clear text or aria-label
- [ ] Icons have aria-label or title
- [ ] Live regions use appropriate ARIA attributes
- [ ] Error messages announced to screen readers

---

## Phase 6: Code Quality

### TypeScript
- [ ] No `any` types (use proper types)
- [ ] All imports have correct types
- [ ] Component props properly typed
- [ ] Event handlers properly typed
- [ ] Builds without TypeScript errors

### React Best Practices
- [ ] Components are functional (no class components)
- [ ] Hooks used properly (dependency arrays, proper order)
- [ ] No unnecessary re-renders (useMemo/useCallback where needed)
- [ ] Props properly destructured
- [ ] No direct DOM manipulation

### CSS/Styling
- [ ] No inline styles (except for generated design system values)
- [ ] CSS classes use descriptive names (not `div-9`, `section-2`)
- [ ] No CSS conflicts or specificity wars
- [ ] Tailwind classes used properly
- [ ] No deprecated CSS properties

### File Organization
- [ ] Components in `components/` directory
- [ ] Pages in `app/` directory (App Router)
- [ ] Utilities in `lib/` directory
- [ ] Config files in root
- [ ] No deeply nested directories (max 3 levels)
- [ ] Filenames are descriptive and kebab-case

---

## Phase 7: Performance

### Image Optimization
- [ ] Images use `next/image` component
- [ ] Images have proper `width` and `height`
- [ ] Images lazy-loaded (except heroes)
- [ ] Hero images have `priority={true}`
- [ ] Proper image formats (WebP with fallback)
- [ ] Image compression/optimization applied

### Code Splitting
- [ ] Heavy libraries lazy-loaded (3D, Lottie, etc.)
- [ ] Dynamic imports for non-critical features
- [ ] Build output is reasonable size
- [ ] No duplicate dependencies

### Bundle Size
- [ ] App bundle < 150KB (initial)
- [ ] No unnecessary dependencies
- [ ] Tree-shaking working properly
- [ ] Assets properly minified

---

## Final Pre-Delivery Checklist

Before marking code as "DONE":

- [ ] **Phase 1 (Design System):** All spacing, typography, colors, shadows from system
- [ ] **Phase 2 (Images):** All images use generateImageUrl(), alt text specific, relevant to app type
- [ ] **Phase 3 (Components):** Consistent styling, proper states, responsive, good layout
- [ ] **Phase 4 (Content):** Realistic mock data, clear copy, working navigation
- [ ] **Phase 5 (Accessibility):** Keyboard accessible, semantic HTML, proper contrast
- [ ] **Phase 6 (Code Quality):** TypeScript clean, proper React patterns, organized files
- [ ] **Phase 7 (Performance):** Images optimized, code split, bundle size acceptable
- [ ] **Type Check:** `pnpm tsc --noEmit` passes
- [ ] **Lint Check:** `pnpm eslint .` passes
- [ ] **Build Check:** `pnpm build` succeeds
- [ ] **Visual Check:** Opens in browser without console errors
- [ ] **Responsive Check:** Looks good at 375px, 768px, 1024px widths
- [ ] **No Warnings:** No console warnings or deprecation notices

---

## Success Criteria

✅ **App looks like:** Apple, Stripe, Linear, Netflix, Neon, Clerk
✅ **No** generic/out-of-context images
✅ **No** hardcoded spacing/colors/typography
✅ **No** single-page MVPs (full multi-page architecture)
✅ **All** images from Unsplash/approved sources
✅ **All** spacing from 4px/8px grid
✅ **All** text from typography scale
✅ **All** interactive elements have states
✅ **Responsive** on mobile, tablet, desktop
✅ **Accessible** keyboard navigation and screen reader
✅ **Builds** without errors or warnings

If all checks pass → Code is DONE and ready for user preview.

---

## Troubleshooting

**Problem:** "Spacing looks wrong"
**Solution:** Check all values use SPACING constants, not hardcoded pixels. Verify padding/margin/gap consistency.

**Problem:** "Images look out of place"
**Solution:** Verify images use generateImageUrl() with correct appType. Run validateAsset() to check for forbidden patterns.

**Problem:** "Typography hierarchy broken"
**Solution:** Check all headings/text use TYPOGRAPHY scale. No custom font sizes.

**Problem:** "Responsive layout broken"
**Solution:** Verify Tailwind breakpoint prefixes (md:, lg:, xl:). Check grid uses responsive columns.

**Problem:** "Focus states missing"
**Solution:** All interactive elements need focus rings. Use `focus-visible:ring-2` or FOCUS styles.

**Problem:** "Build fails with type errors"
**Solution:** Run `pnpm tsc --noEmit` to see errors. Fix type issues before deployment.

---

See: `INSTITUTIONAL_DESIGN_GUIDE.md` for detailed implementation examples.
