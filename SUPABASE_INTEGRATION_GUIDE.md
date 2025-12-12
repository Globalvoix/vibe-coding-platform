# Supabase Integration - Complete Guide

## Overview

The new Supabase integration allows users to connect their Supabase projects directly from the chat prompt bar in the workspace. Once connected, the AI automatically has access to the Supabase backend and can create database tables, functions, enable real-time subscriptions, and manage the database schema.

## Architecture

### 1. **User Flow**

```
User clicks "Supabase" button in prompt bar
    ↓
OAuth authorization to Supabase (PKCE flow)
    ↓
User selects their Supabase project from organization
    ↓
Project connection saved per app-project
    ↓
AI automatically has access to Supabase for future messages
```

### 2. **Key Components**

#### Frontend Components

- **SupabaseButton** (`components/supabase-button/supabase-button.tsx`)
  - Displays in the prompt input toolbar
  - Shows connection status
  - Initiates OAuth flow on click

- **SupabaseBadge** (`components/supabase-badge/supabase-badge.tsx`)
  - Shows confirmation when Supabase is connected
  - Displays connected project name
  - Auto-refreshes connection status

#### Pages

- **Supabase Select Project** (`app/supabase-select-project/page.tsx`)
  - User interface after OAuth authorization
  - Shows list of Supabase projects from user's organization
  - Allows project selection with visual confirmation

#### API Routes

- **OAuth Start** (`app/api/supabase-connect/start/route.ts`)
  - Initiates PKCE OAuth flow
  - Stores state and verifier in secure cookies

- **OAuth Callback** (`app/api/supabase-connect/callback/route.ts`)
  - Handles OAuth response from Supabase
  - Exchanges code for access token
  - Redirects to project selection page

- **Projects List** (`app/api/supabase-connect/projects/route.ts`)
  - Fetches user's Supabase projects
  - Uses Supabase access token

- **Save Connection** (`app/api/supabase-connect/save/route.ts`)
  - Saves selected Supabase project to app project
  - Stores access token and project metadata

- **Connection Status** (`app/api/supabase-connect/status/route.ts`)
  - Returns connection status for a project
  - Includes project name and reference

- **Schema Management** (`app/api/supabase-backend/schema/route.ts`)
  - Handles database operations (create table, function, etc.)
  - Uses stored Supabase tokens to execute operations

### 3. **Database Schema**

Table: `supabase_projects`

```sql
CREATE TABLE supabase_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,  -- App project ID
  supabase_project_ref TEXT NOT NULL,  -- Supabase project reference
  supabase_org_id TEXT,
  supabase_project_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

## How It Works

### 1. **Connecting Supabase**

1. User clicks the Supabase button in the prompt input toolbar
2. Browser redirects to `/api/supabase-connect/start?appProjectId=xxx`
3. User authorizes in Supabase (OAuth)
4. Supabase redirects back to `/api/supabase-connect/callback`
5. User selects their Supabase project from the list
6. Selection is saved to database
7. User is redirected back to workspace

### 2. **AI Access to Supabase**

When a user sends a chat message:

1. Frontend sends `supabaseConnected` flag to API
2. Chat route fetches Supabase project details from database
3. Adds Supabase context to system prompt
4. AI receives information that Supabase is available
5. AI can use the `createRealtimeBackend` tool to interact with Supabase

### 3. **Database Operations**

When AI calls the `createRealtimeBackend` tool:

1. Tool validates that Supabase is connected
2. Sends request to `/api/supabase-backend/schema`
3. API fetches stored Supabase tokens
4. Executes SQL operation on Supabase database
5. Returns result to AI and user

## Environment Variables Required

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_OAUTH_CLIENT_ID=your-client-id
SUPABASE_OAUTH_CLIENT_SECRET=your-client-secret

# Optional (defaults to NEXT_PUBLIC_APP_URL)
SUPABASE_OAUTH_REDIRECT_URL=https://your-domain.com/api/supabase-connect/callback
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Security

- **PKCE Flow**: Authorization code interception protected
- **Secure Cookies**: OAuth state/verifier stored in httpOnly cookies
- **Token Storage**: Access tokens stored securely in database
- **No Browser Storage**: Sensitive data never exposed to browser
- **Per-Project Isolation**: Each app project has its own Supabase connection
- **User-Scoped Access**: Connections tied to authenticated user

## Usage Example (AI Prompt)

```
User: "Create a real-time chat app with user authentication and message history"

AI Flow:
1. Recognizes Supabase is connected
2. Creates necessary tables (users, messages, etc.)
3. Enables real-time subscriptions on relevant tables
4. Generates frontend code with real-time subscriptions
5. Generates backend functions for chat operations
```

## Files Created/Modified

### New Files
- `lib/supabase-projects-db.ts` - Database module
- `app/api/supabase-connect/start/route.ts` - OAuth start
- `app/api/supabase-connect/callback/route.ts` - OAuth callback
- `app/api/supabase-connect/projects/route.ts` - Project list
- `app/api/supabase-connect/save/route.ts` - Save connection
- `app/api/supabase-connect/status/route.ts` - Status check
- `app/api/supabase-backend/schema/route.ts` - Schema management
- `app/supabase-select-project/page.tsx` - Project selection UI
- `components/supabase-button/supabase-button.tsx` - Button component
- `components/supabase-badge/supabase-badge.tsx` - Badge component

### Modified Files
- `app/chat.tsx` - Added Supabase button and status checking
- `app/api/chat/route.ts` - Added Supabase context to prompts
- `ai/tools/index.ts` - Pass supabaseConnected to tools
- `ai/tools/create-realtime-backend.ts` - Handle Supabase context

### Deleted Files
- `app/api/supabase/oauth/start/route.ts`
- `app/api/supabase/oauth/callback/route.ts`
- `app/api/projects/[id]/supabase-connection/route.ts`
- `app/api/projects/[id]/supabase-disconnect/route.ts`
- `app/api/projects/[id]/supabase-schema/route.ts`
- `lib/supabase-connections-db.ts`
- `components/supabase-connection-manager/`
- `components/database-viewer/`
- Old documentation files

## Testing Checklist

- [ ] Supabase button appears in prompt toolbar
- [ ] Clicking button initiates OAuth flow
- [ ] Can select from list of Supabase projects
- [ ] Connection status badge appears after selection
- [ ] Connection persists across page reloads
- [ ] AI receives Supabase context in prompts
- [ ] AI can create tables using `createRealtimeBackend` tool
- [ ] AI can enable real-time subscriptions
- [ ] Real-time features work in generated code

## Future Enhancements

- Token refresh when expired
- Multiple Supabase projects per app project
- Custom schema validation
- Automatic RLS policy generation
- Database migration tracking
- Backup/restore functionality
