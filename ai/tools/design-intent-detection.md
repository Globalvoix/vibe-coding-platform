# Design Intent Detection & Pattern Selection Tool

This tool guides the AI through the process of identifying application type and selecting appropriate design patterns for authentic, purpose-driven UI generation.

## STEP 1: INTENT ANALYSIS

### Keywords to Listen For

#### E-COMMERCE / RETAIL
- "store", "shop", "create a shop", "online store"
- "products", "catalog", "inventory", "merchandise"
- "clothing brand", "apparel", "fashion", "boutique"
- "buy", "sell", "checkout", "cart", "payment"
- Brand names + "store" or "shop" (e.g., "Vibe clothing store")
- Vertical indicators: "sneaker store", "accessory shop", "clothing boutique"

#### SAAS / BUSINESS APPS / DASHBOARDS
- "dashboard", "analytics", "reporting", "metrics"
- "app for managing", "tool to help", "platform for"
- "collaboration", "productivity", "workflow", "automation"
- "booking system", "CRM", "project manager", "issue tracker"
- "web application", "business app", "admin panel"
- Problem-focused: "help teams do X better", "solve the problem of Y"

#### WEB APP CLONES / RECREATIONS
- "clone of", "like [app name]", "based on", "inspired by"
- Specific app mentions: Twitter, Figma, Notion, Slack, Discord, etc.
- "recreate", "build something similar to"
- UI/feature-focused requests referencing existing apps

#### MARKETING / LANDING PAGES
- "landing page", "marketing site", "homepage", "promo page"
- "convince people to", "show why", "sell the benefits"
- Single-purpose websites
- Focus on conversion

#### PORTFOLIOS / PERSONAL SITES
- "portfolio", "resume site", "showcase my work", "about me"
- Individual focus, less transactional

---

## STEP 2: PATTERN SELECTION

Once intent is detected, select the dominant pattern:

### Pattern A: E-COMMERCE ARCHITECTURE
```
✓ Sticky header with:
  - Logo/brand
  - Navigation (mega-menu for categories)
  - Search bar
  - Cart icon with count badge
  - Account/login

✓ Hero section with:
  - Large featured product image or seasonal banner
  - Promotional text ("New Collection", "Summer Sale")
  - Call-to-action button

✓ Product browsing:
  - Responsive grid (2-3 on mobile, 3-4 on tablet, 4-5 on desktop)
  - Product cards with:
    • Large product image
    • Hover overlay with "Add to Cart" + wishlist quick action
    • Badge for sale/new/limited
    • Product name, category, price, sale price if applicable
    • Star ratings + review count
  - Sidebar filters (category, price range, size, color, brand)
  - Sort dropdown (newest, price low/high, popular)

✓ Product detail page:
  - Image gallery (main + thumbnails)
  - Product info (name, price, ratings, reviews)
  - Options (size, color, quantity selector)
  - "Add to Cart" button (large, bold)
  - Wishlist button
  - Trust signals (shipping info, return policy, reviews preview)

✓ Footer with:
  - Newsletter signup
  - Links (help, about, social)
  - Company info

Key Colors: Brand accent + neutral backgrounds
Key Typography: Bold, large product images; clean readable text for info
```

### Pattern B: SAAS/BUSINESS DASHBOARD ARCHITECTURE
```
✓ Sticky navigation:
  - Logo/brand on left
  - Main links (Features, Pricing, Docs, About, Blog)
  - Sign in + Get Started CTA
  - Minimal, clean aesthetic

✓ Hero section:
  - Problem-focused headline ("Manage X faster", "Eliminate Y")
  - Benefit-focused subheading
  - Primary CTA ("Start Free Trial", "Get Started")
  - Secondary CTA ("Watch Demo", "View Docs")
  - Trust badges (no credit card required, setup time, support)

✓ Dashboard mockup:
  - Full-width browser mockup or screenshot
  - Shows product in action
  - May include floating cards with key metrics

✓ Feature sections:
  - 3-column grid with icon + title + description
  - Can be alternating text/image layout
  - Focus on benefits, not technical details
  - Icons with single color (usually brand color)

✓ Social proof:
  - Customer logos (with low opacity)
  - Testimonial cards (quote + author + role)
  - Stats (e.g., "10,000+ teams", "30% faster shipping")

✓ Pricing section:
  - Clear table or card grid
  - 3 tiers common (Starter, Professional, Enterprise)
  - Popular plan highlighted (ring border + shadow)
  - Feature checkmarks
  - CTA per tier

✓ FAQ accordion (optional)

✓ Final CTA section:
  - Large headline
  - Primary button
  - Subtext (trust signal)

Key Colors: 1-2 accent colors (blue/purple common) + grays
Key Typography: Large bold headlines emphasizing benefits; professional sans-serif
```

### Pattern C: WEB APP CLONE ARCHITECTURE
```
✓ Study the original app:
  - Note primary navigation pattern
  - Observe color scheme (brand colors)
  - Identify key interface sections (sidebar, header, main content)
  - Understand main interactions (hover effects, transitions)

✓ Preserve essential patterns:
  - Navigation hierarchy and location
  - Layout structure (sidebar + main, full-width, multi-column, etc.)
  - Color scheme and visual hierarchy
  - Key interaction patterns

✓ Implement thoughtfully:
  - Use modern stack (Next.js, Tailwind, etc.)
  - Match typography and spacing to original
  - Include primary features/views
  - Smooth transitions and hover states
  - Responsive across devices

✓ Avoid:
  - Exact pixel-perfect copies (adapt for modern practices)
  - Missing key features/sections
  - Poor responsive design
  - Broken interactions or navigation
```

---

## STEP 3: DESIGN EXTRACTION (OPTIONAL but RECOMMENDED)

If the app type is clear and well-established (e-commerce, SaaS), use APIs to find inspiration:

1. **EXA API Search** (for finding examples):
   - E-commerce: "magicui.design product card", "shadcn/ui ecommerce template", "shots.so clothing store hero"
   - SaaS: "magicui.design hero section saas", "shadcn/ui dashboard", "shots.so pricing page"
   - Clones: "[app name] design clone", "[app] UI components", "recreate [app]"

2. **Firecrawl API Extract** (for fetching code):
   - Extract HTML/CSS from design showcase pages
   - Get component implementations
   - Retrieve color palettes, spacing systems

3. **Adapt & Remix**:
   - Combine 2-3 inspirations (never just one)
   - Change colors to match user brand
   - Adjust typography to match tone
   - Reorder sections based on user priorities

---

## STEP 4: IMPLEMENTATION CHECKLIST

For each app type, ensure:

### E-COMMERCE
- [ ] Header has cart icon with count
- [ ] Products shown in grid with images
- [ ] Product hover reveals quick-add or details button
- [ ] Wishlist functionality (heart icon)
- [ ] Price clearly displayed with optional sale price
- [ ] Product reviews/ratings visible
- [ ] Filters for browsing (category, price, etc.)
- [ ] Search functionality in header
- [ ] Footer with newsletter + links
- [ ] Responsive: mobile shows 2 cols, tablet 3-4, desktop 4-5

### SAAS/DASHBOARDS
- [ ] Clean sticky nav with brand + links + CTA
- [ ] Hero emphasizes problem solved, not product name
- [ ] Hero has primary + secondary CTAs
- [ ] Trust badges present (free trial, setup time, etc.)
- [ ] Product screenshot/mockup shown
- [ ] 3+ feature sections clearly explaining benefits
- [ ] Social proof (logos + testimonials)
- [ ] Pricing with 3 tiers or clear structure
- [ ] Final strong CTA section
- [ ] Responsive: mobile stacks nicely, nav adapts

### CLONES
- [ ] Primary navigation matches original
- [ ] Color scheme inspired by but not identical to original
- [ ] Key interface sections present (sidebar, header, main content, etc.)
- [ ] Interactions smooth (hover states, transitions)
- [ ] Responsive design is thoughtful, not just shrunk
- [ ] No broken links or placeholder content
- [ ] Matches original functionality/purpose

---

## EXAMPLE DETECTION IN ACTION

### Request 1: "Create an e-commerce store for a clothing brand called Vibe"
```
Intent: E-COMMERCE (keywords: e-commerce, store, clothing brand)
Pattern: E-COMMERCE ARCHITECTURE (Pattern A)
Design Extraction:
  - Search "magicui.design product grid component"
  - Search "shots.so clothing store hero"
  - Extract inspiration for header, hero, product cards
Implementation:
  - Sticky nav with Vibe logo + categories + search + cart
  - Hero with seasonal imagery + "New Collection" CTA
  - 4-column product grid with images, prices, wishlist
  - Sidebar filters (category, size, color, price)
  - Product detail page with image gallery + add to cart
  - Footer with newsletter
Result: Looks like a real clothing store
```

### Request 2: "Build a SaaS dashboard for project management"
```
Intent: SAAS (keywords: SaaS, dashboard, project management)
Pattern: SAAS/BUSINESS DASHBOARD (Pattern B)
Design Extraction:
  - Search "magicui.design hero section productivity"
  - Search "shadcn/ui dashboard pricing"
  - Extract inspiration for nav, hero, features, pricing
Implementation:
  - Clean sticky nav with logo + Features/Pricing/Docs + Sign In + Get Started
  - Hero: "Manage projects faster. Ship on time." + CTA buttons
  - Dashboard screenshot in browser mockup
  - 3 feature columns (Collaboration, Analytics, Automation)
  - Social proof section with logos + testimonials
  - Pricing table with 3 tiers
  - Final CTA "Start 14-Day Free Trial"
Result: Looks like a real SaaS landing page
```

### Request 3: "Create a Notion-like app"
```
Intent: CLONE (keywords: Notion-like, clone)
Pattern: WEB APP CLONE (Pattern C)
Implementation:
  - Left sidebar with file/workspace hierarchy
  - Center area for rich text editing
  - Right sidebar for properties/meta
  - Support for different view types (page, database, etc.)
  - Colors inspired by Notion (dark sidebar, light main area)
  - Smooth transitions and hover effects
Result: Visually recognizable as Notion-inspired while being original
```

---

## DO NOT Checklist

❌ Generate a "generic" app that doesn't reflect its purpose
❌ Use e-commerce patterns for a SaaS app
❌ Use SaaS patterns for an e-commerce store
❌ Copy designs exactly without understanding them
❌ Forget key interface patterns for the app type
❌ Ignore responsive design and mobile experience
❌ Use generic placeholder content
❌ Create identical designs on multiple requests
❌ Include broken interactions or navigation
❌ Ignore accessibility standards

---

## DO Checklist

✅ Always detect intent first
✅ Select appropriate pattern based on app type
✅ Extract inspiration from multiple premium sources
✅ Adapt and remix (never copy exactly)
✅ Implement all essential patterns for app type
✅ Ensure responsive design is thoughtful
✅ Include smooth interactions and micro-animations
✅ Add trust signals and social proof where relevant
✅ Vary designs across requests
✅ Follow accessibility standards throughout
✅ Include high-quality imagery (Unsplash, etc.)
✅ Test across mobile, tablet, desktop

---

## Questions to Ask When Uncertain

1. "What is the primary purpose of this application?" → Determines pattern
2. "Who is the target user?" → Informs design tone and complexity
3. "What is the main conversion goal?" → Shapes layout and CTAs
4. "Are there existing apps to reference?" → Enables clone pattern
5. "What is the brand/company name?" → Personalizes the design

Use user answers to refine intent detection and pattern selection.
