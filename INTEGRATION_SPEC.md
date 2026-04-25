# Integration Specification: OpenCode + OpenAgents + VibeCodingPlatform

## Overview

This document defines the architecture for integrating **OpenCode** as the agent brain with **OpenAgents** as the runtime and infrastructure, while keeping the **VibeCodingPlatform** UI/pages.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VibeCodingPlatform                         │
│  (UI/Pages - Unchanged)                                       │
│  - app/chat.tsx                                               │
│  - components/                                                │
│  - Workspace page                                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                    API Route: /api/chat
                             │
        ┌────────────────────┴────────────────────┐
        │            New Agent System                  │
        │  ┌─────────────────┐  ┌────────────────┐  │
        │  │   OpenCode      │  │  OpenAgents     │  │
        │  │  (Agent Brain)  │  │  (Runtime)     │  │
        │  │                 │  │                │  │
        │  │ - Session      │  │ - Agent Run    │  │
        │  │ - LLM          │  │ - Tools        │  │
        │  │ - Provider     │  │ - Sandbox     │  │
        │  │ - Models       │  │ - Workflow    │  │
        │  └─────────────────┘  └────────────────┘  │
        └────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Replace `ai/tools` (OpenCode Agent Brain)

**Location:** `vibe-coding-platform/opencode/packages/opencode/src/session/`

**Files to integrate:**
- `session/session.ts` - Main session orchestration
- `session/llm.ts` - LLM integration
- `session/processor.ts` - Message processing
- `provider/` - Model providers

### 2. Use OpenAgents Runtime

**Location:** `vibe-coding-platform/open-agents/packages/`

**Components:**
- `agent/open-agent.ts` - Main agent entry point
- `agent/tools/` - File operations, shell, search
- `sandbox/` - Vercel sandbox integration

### 3. Wire into Chat API

**File:** `app/api/chat/route.ts`

**Changes:**
- Replace `streamText()` with OpenCode session run
- Use OpenAgents tools instead of current `ai/tools`
- Maintain existing UI streaming interface

## Current vs Target

### Current Flow
```
User Message → streamText() → ai/gateway → ai/tools → Response
```

### Target Flow
```
User Message → OpenCode Session → OpenAgents Agent → Sandbox → Response
```

## Module Mapping

### OpenCode (Agent Brain)
| Module | Purpose |
|--------|---------|
| `session/session.ts` | Session state & orchestration |
| `session/llm.ts` | LLM provider abstraction |
| `session/processor.ts` | Message handling |
| `provider/` | Model configuration |

### OpenAgents (Runtime)
| Module | Purpose |
|--------|---------|
| `agent/open-agent.ts` | Agent entry point |
| `agent/tools/` | Tool implementations |
| `sandbox/` | Execution environment |

## API Changes Required

### `/api/chat/route.ts`
- Import OpenCode session runner
- Swap tool definitions to OpenAgents
- Maintain streaming interface

### `components/model-selector/`
- No changes needed (UI layer)

## File Structure After Integration

```
vibe-coding-platform/
├── app/
│   └── api/chat/route.ts      # Modified: uses new agent
├── opencode/                  # New: Agent brain
│   └── packages/opencode/
│       └── src/session/      # Session logic
├── open-agents/              # New: Runtime
│   ├── packages/agent/      # Agent + tools
│   └── packages/sandbox/    # Sandbox infra
└── ai/                      # Old: can be removed
    ├── tools/                # → replaced by open-agents
    ├── gateway.ts           # → replaced by opencode
    └── constants.ts         # → replaced by opencode
```

## Dependencies

### Required from OpenCode
- `@ai-sdk/*` - Model providers (already compatible)
- `effect` - Runtime (compatible with next)

### Required from OpenAgents
- `@ai-sdk/anthropic` - Claude provider
- `@ai-sdk/openai` - OpenAI provider
- `ai` - Vercel AI SDK

## Implementation Phases

### Phase 1: Setup
1. Move opencode to packages/agent-core
2. Move open-agents to packages/runtime
3. Configure workspace dependencies

### Phase 2: Integration
1. Create agent bridge module
2. Update chat API route
3. Wire tool definitions

### Phase 3: Migration
1. Replace old ai/gateway with OpenCode
2. Replace old ai/tools with OpenAgents
3. Test streaming response

### Phase 4: Cleanup
1. Remove deprecated ai/ files
2. Update model selector
3. Update constants

## Backward Compatibility

- Keep model selector UI unchanged
- Maintain same credit system
- Preserve project/sandbox DB schema