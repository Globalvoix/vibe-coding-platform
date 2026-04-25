# Quick Design Reference

**TL;DR** - Use this checklist every time you generate an application.

## 1️⃣ DETECT INTENT (5 seconds)

Read the user request and ask: What is this app?

| Keywords | App Type | Pattern |
|----------|----------|---------|
| store, shop, products, buy, clothing, apparel | **E-COMMERCE** | See `domain-specific-designs.md` § E-COMMERCE |
| dashboard, app, manage, productivity, tool, SaaS | **SAAS/BUSINESS** | See `domain-specific-designs.md` § SAAS |
| clone, like [app], similar to, recreate | **CLONE** | See `domain-specific-designs.md` § WEB APP CLONES |
| landing page, marketing, convince | **MARKETING** | Clean hero + features + CTA + testimonials |
| portfolio, about, showcase | **PERSONAL** | Focus on work samples + bio + contact |

**If unsure**: Ask "What is the primary purpose of this application?"

---

## 2️⃣ SELECT PATTERN (30 seconds)

### E-COMMERCE ESSENTIALS
```
Header:  Logo + Categories + Search + Cart
Hero:    Large product image + "Shop Now" CTA
Browse:  4-column grid + sidebar filters + sort dropdown
Details: Image gallery + add to cart + wishlist + reviews
Footer:  Newsletter + links + social
```

### SAAS ESSENTIALS
```
Header:  Logo + Features/Pricing/Docs + Sign In + Get Started
Hero:    Problem headline + benefit text + 2 CTAs + trust badges
Mockup:  Dashboard screenshot in browser frame
Features: 3-column grid explaining benefits
Proof:    Logos + testimonials + metrics
Pricing:  3 tiers with popular one highlighted
CTA:     Final "Get Started" section
```

### CLONE ESSENTIALS
```
Step 1: Study original app thoroughly
Step 2: Preserve navigation patterns + colors + layout
Step 3: Implement in modern stack (Next.js + Tailwind)
Step 4: Match interactions + hover states
Step 5: Ensure responsive design
```

---

## 3️⃣ EXTRACT INSPIRATION (1 minute - OPTIONAL but RECOMMENDED)

Use EXA + Firecrawl for quality examples:

**E-COMMERCE SEARCHES:**
- "magicui.design product card"
- "shots.so clothing store hero"
- "shadcn/ui shopping cart"

**SAAS SEARCHES:**
- "magicui.design hero saas"
- "shots.so dashboard landing page"
- "vercel.com pricing"

**Extract code from 2-3 sources** → Adapt colors/typography → Build unique version

See `design-extraction-api-guide.md` for detailed workflow.

---

## 4️⃣ IMPLEMENT (Build with guidelines)

### Colors
- **E-COMMERCE**: Brand accent + neutral background. Use product images as color story.
- **SAAS**: 1-2 accent colors (blue/purple common) + grays. Restrained and professional.
- **CLONE**: Match original's color scheme, adapt slightly for modern aesthetic.

### Typography
- **E-COMMERCE**: Bold headlines, clean readable body text for product info.
- **SAAS**: Large bold headlines emphasizing benefits. Professional sans-serif.
- **CLONE**: Match original's font families, adapt sizes for modern readability.

### Spacing
- Use generous spacing (24px+ between sections)
- Mobile: Tighter spacing, larger touch targets
- Desktop: Breathing room, clear hierarchy

### Interactions
- Hover states: Scale (1.02x), shadow elevation, color shift
- Transitions: 200-300ms easing (ease-out)
- Loading: Skeleton screens, not spinners
- Feedback: Toast notifications, visual confirmation

### Responsive
- Mobile-first: Design for 320px first
- Tablet: Optimize for 640px-1024px
- Desktop: 1024px+ with full features
- Test: iPhone 12, iPad, desktop monitor

---

## 5️⃣ QUALITY CHECKLIST (Before finalizing)

### ALL APPS
- [ ] Responsive across mobile, tablet, desktop
- [ ] Navigation is clear and accessible
- [ ] Color contrast is WCAG AAA (7:1)
- [ ] Interactions are smooth (no jank)
- [ ] Images are high-quality (Unsplash)
- [ ] Typography hierarchy is clear
- [ ] No broken links or placeholder content
- [ ] Keyboard navigation works

### E-COMMERCE ONLY
- [ ] Cart icon visible with count badge
- [ ] Products shown in grid with images
- [ ] Quick-add hover overlay works
- [ ] Wishlist functionality visible
- [ ] Filters and sorting available
- [ ] Product details page complete
- [ ] Trust signals present (free shipping, returns, etc.)

### SAAS ONLY
- [ ] Hero emphasizes problem solved (not product name)
- [ ] Has 2 CTAs (primary + secondary)
- [ ] Trust badges visible (free trial, setup time, etc.)
- [ ] Dashboard mockup shown
- [ ] Feature sections explain benefits
- [ ] Social proof included (logos + testimonials)
- [ ] Pricing is clear and transparent
- [ ] Final CTA is strong

### CLONE ONLY
- [ ] Navigation structure matches original
- [ ] Key sections present and functional
- [ ] Colors inspired by original
- [ ] Interactions match original feel
- [ ] Responsive design is thoughtful (not just shrunk)
- [ ] No broken features

---

## 6️⃣ PREVENT COMMON MISTAKES

❌ **DON'T** generate a generic app that doesn't match its purpose
- E-commerce that looks like a SaaS dashboard
- SaaS with product grid like a store
- Clone that doesn't resemble original

❌ **DON'T** use the same design twice
- Vary colors, typography, layout, interactions
- Mix inspirations from different sources
- Create unique variations

❌ **DON'T** forget responsive design
- Mobile isn't just desktop shrunk
- Touch targets min 44x44px
- Layout should adapt intelligently

❌ **DON'T** ignore accessibility
- WCAG AAA contrast (7:1)
- Semantic HTML
- Keyboard navigation
- Focus states

❌ **DON'T** use placeholder images
- Use Unsplash for high-quality photos
- Include photographer attribution
- Optimize with next/image

---

## HELPFUL REFERENCES

- **Full E-COMMERCE patterns**: `ai/tools/domain-specific-designs.md` § 1. E-COMMERCE STORES
- **Full SAAS patterns**: `ai/tools/domain-specific-designs.md` § 2. SAAS LANDING PAGES
- **Full CLONE guidance**: `ai/tools/domain-specific-designs.md` § 3. WEB APP CLONES
- **Design principles**: `ai/tools/design-principles-advanced.md`
- **Enterprise patterns**: `ai/tools/enterprise-ui-patterns.md`
- **Design extraction API**: `ai/tools/design-extraction-api-guide.md`
- **Intent detection**: `ai/tools/design-intent-detection.md`

---

## WORKFLOW EXAMPLE

**USER**: "Create an e-commerce store for a sneaker brand called 'AirStride'"

**YOUR WORKFLOW:**
```
1. DETECT: Keywords "e-commerce store", "sneaker brand" → E-COMMERCE
2. PATTERN: Use E-COMMERCE pattern (header, hero, product grid, filters, footer)
3. EXTRACT: 
   - Search "magicui.design product card component"
   - Search "shots.so luxury sneaker store hero"
   - Extract HTML/CSS → Adapt colors to sneaker brand (maybe dark + neon accent)
4. IMPLEMENT:
   - Header: AirStride logo + categories + search + cart
   - Hero: Large sneaker hero image + "New Releases" CTA
   - Products: 4-column grid with images, prices, quick-add, wishlist
   - Filters: Size, color, price, brand
   - Details: Image gallery + specifications + reviews + add to cart
   - Footer: Newsletter + links
5. STYLE:
   - Colors: Dark navy (#0f172a) + electric blue (#0084ff) accents
   - Typography: Bold sans-serif for headlines, clean body text
   - Spacing: Generous (24px+ margins), breathable layout
   - Interactions: Hover scales product image, smooth transitions
6. REVIEW:
   - ✅ Looks like a real sneaker store
   - ✅ Product images are hero
   - ✅ Shopping functionality clear
   - ✅ Brand colors applied
   - ✅ Responsive and accessible
```

---

## FINAL RULE

**The app should look like what it is.**

An e-commerce store should feel like shopping.
A SaaS app should feel professional and trustworthy.
A clone should visually resemble the original.

If you look at the result and think "this could be a [different type of app]", redesign it.
