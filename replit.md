# Vibe Coding Agent

A Next.js 15 AI-powered coding agent application that allows users to generate web applications using AI.

## Tech Stack

- **Framework**: Next.js 15.5.7 (App Router)
- **Runtime**: Node.js 22
- **Package Manager**: pnpm 10.23.0
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: PostgreSQL via `pg` + Supabase
- **AI Providers**: OpenAI, Anthropic, Google (via AI SDK)
- **Payments**: Lemon Squeezy
- **UI**: Tailwind CSS v4, Radix UI, Framer Motion
- **Code Execution**: `@vercel/sandbox`

## Architecture

- `app/` — Next.js App Router pages and API routes
- `components/` — Shared React components
- `lib/` — Server utilities, DB clients, AI helpers
- `ai/` — AI-related logic

## Replit Configuration

- **Port**: 5000 (bound to 0.0.0.0)
- **Dev command**: `pnpm run dev` (Next.js with `-p 5000 -H 0.0.0.0`)
- **Workflow**: "Start application"

## Required Environment Variables / Secrets

The following secrets need to be set for the app to fully function:

### Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Database
- `DATABASE_URL` — PostgreSQL connection string (already set via Replit DB)
- `SUPABASE_DB_URL` — Supabase database direct URL
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key

### Supabase Public (client-side)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase OAuth
- `SUPABASE_OAUTH_CLIENT_ID`
- `SUPABASE_OAUTH_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID`
- `SUPABASE_OAUTH_REDIRECT_URL`
- `SUPABASE_OAUTH_SCOPES`
- `SUPABASE_PLATFORM_URL`

### AI Providers
- `OPENAI_API_KEY`

### GitHub App Integration
- `GITHUB_APP_ID`
- `GITHUB_APP_SLUG`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_STATE_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_OAUTH_REDIRECT_URL`

### Payments
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `LEMON_SQUEEZY_PRO_PRODUCT_ID`
- `LEMON_SQUEEZY_BUSINESS_PRODUCT_ID`
- `LEMON_SQUEEZY_ENTERPRISE_PRODUCT_ID`

### Security / Encryption
- `ENV_VAR_ENCRYPTION_KEY`
- `OAUTH_TOKEN_ENCRYPTION_KEY`

### Optional
- `ELEVEN_LABS_API_KEY`
