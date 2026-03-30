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
- **Code Execution**: `e2b` (E2B sandbox)
- **Code Editor**: `@monaco-editor/react` (Monaco, lazy-loaded)

## Architecture

### Multi-Agent Pipeline (True Parallel)
Every user request passes through a 5-agent pipeline orchestrated in `lib/orchestrator/index.ts`:

1. **Historian** + **Architect** — Fire **simultaneously** via `Promise.allSettled`; Historian queries past sessions; Architect produces a structured `ExecutionPlan` JSON
2. **Craftsman** — Spawns N **parallel subtask threads** (one per `parallelTaskGroups` entry) each writing `FileDiff[]`; runs alongside Adversary concurrently
3. **Adversary** (`lib/agents/adversary.ts`) — Simultaneously attacks the plan for critical errors, type mismatches, security issues
4. **Synthesizer** (`lib/agents/synthesizer.ts`) — Reconciles all parallel outputs → patches critical issues → produces `executionDirective` system prompt

### Model Routing
- **Gemini Flash 3** (`google/gemini-2.5-flash`) — Historian, UI file generation
- **Claude Sonnet 4.5** (`anthropic/claude-sonnet-4.5`) — Architect, Adversary, Synthesizer, backend file generation
- **GPT-5.1 Codex Max** (`openai/gpt-5.1-codex-max`) — Auto-retry debugger in `lib/orchestrator/executor-retry.ts`

Per-file model routing is applied in `ai/tools/generate-files/get-contents.ts` via `chooseFileGenerationModelId`.

### Diff Preview System
Generated files are **not written directly to E2B**. Instead, `ai/tools/generate-files.ts` stages them as `pending_diffs` in Postgres. The chat stream emits a `data-pending-diff` part that renders a Monaco DiffEditor card (`components/diff/pending-diff-card.tsx`). The user approves or discards; approved files are written to E2B via `POST /api/projects/[id]/diffs/apply`.

### Auto-Retry Executor
`lib/orchestrator/executor-retry.ts` runs commands in E2B with up to 3 retry attempts. On failure it calls GPT to analyze stdout/stderr and generate a fix command, then re-runs. All outcomes are logged to `agent_events`.

### Agent Pipeline UI
- `components/chat/message-part/agent-pipeline.tsx` — Inline `AgentPipeline` (per-agent status row) + `AgentPipelinePanel` (full pipeline overview with parallel thread list)
- `app/state.ts` — Zustand store with `agents`, `subtaskThreads`, `pendingDiff`, `pendingDiffResolved`, `useDataStateMapper` handles all `data-agent-status`, `data-subtask-thread`, `data-pending-diff`, `data-diff-decision` events

### Event Log (Time-Travel Replay)
`lib/orchestrator/event-log.ts` appends every pipeline event to `agent_events` Postgres table. `getSessionEvents` / `getProjectHistory` enable full session replay.

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

### Code Execution (E2B)
- `E2B_API_KEY` — E2B sandbox API key (https://e2b.dev/dashboard)

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
