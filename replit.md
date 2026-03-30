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

### Multi-Agent Pipeline
Every user request passes through a 4-agent pipeline before code generation begins:

1. **Historian** (`lib/agents/historian.ts`) — Queries past sessions from Postgres `agent_events` table for relevant patterns and pitfalls
2. **Architect** (`lib/agents/architect.ts`) — Reads user intent + historian context, produces a structured `ExecutionPlan` JSON (files, tasks, packages, decisions)
3. **Craftsman + Adversary** (`lib/agents/craftsman.ts` + `lib/agents/adversary.ts`) — Run in **parallel**: Craftsman produces `FileDiff[]` describing what to build; Adversary simultaneously attacks the plan looking for critical errors, type mismatches, and security issues
4. **Synthesizer** (`lib/agents/synthesizer.ts`) — Reconciles diffs + problems → patches critical issues → produces an `executionDirective` that becomes the enhanced system prompt

The enhanced system prompt is then fed into the existing `streamText` + tools execution loop, which writes files into the Vercel sandbox.

### Orchestrator (`lib/orchestrator/`)
- `index.ts` — Main pipeline coordinator, streams agent status events to the UI
- `event-log.ts` — Immutable append-only Postgres event log (`agent_events` table) — every agent action, plan, diff, and result is recorded for replay and time-travel
- `task-queue.ts` — Postgres-backed task queue (`agent_tasks` table) with status tracking, retry counting, and parallel execution support

### Directory Structure
- `app/` — Next.js App Router pages and API routes
- `components/` — Shared React components
- `lib/agents/` — The 4 specialized agents + shared types
- `lib/orchestrator/` — Pipeline coordinator, event log, task queue
- `lib/` — Server utilities, DB clients, AI helpers
- `ai/` — AI tools, gateway, constants, model routing

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
