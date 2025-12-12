# Thinksoft Cloud - Real-time Backend Integration

This guide explains the new Thinksoft Cloud system, which integrates Supabase for real-time backend capabilities, similar to Lovable.

## Overview

Thinksoft Cloud allows AI to automatically provision and manage Supabase backends for applications. Users can:

1. Connect their Supabase project via OAuth
2. View connection status and manage settings
3. Have AI generate real-time database schemas
4. Create backend functions and enable real-time subscriptions
5. Build full-stack applications with persistent, real-time data

## Architecture

### User Flow

```
User clicks "Enable Supabase"
        ↓
    OAuth flow
    (user authorizes with Supabase)
        ↓
    Supabase project info stored
    (ref, org_id, name)
        ↓
    Connection Manager displayed
    (links to SQL Editor, Auth, etc.)
        ↓
    AI can create real-time backend
    (using createRealtimeBackend tool)
        ↓
    Frontend code subscribes to data
    (real-time updates)
```

## Components

### 1. **SupabaseConnectionManager** (`components/supabase-connection-manager/`)

The main UI component that displays Supabase connection status. Shows:

- Connection status (Connected/Not Connected)
- Quick links to Supabase features:
  - Manage Users (Authentication)
  - SQL Editor (Query/Create tables)
  - Edge Functions (Serverless functions)
  - Manage Secrets (Environment variables)
- Manage Organizations button
- Disconnect button

**File**: `components/supabase-connection-manager/supabase-connection-manager.tsx`

### 2. **OAuth Flow** (`app/api/supabase/oauth/`)

Two endpoints handle Supabase authentication:

- **Start** (`/start`): Initiates PKCE flow, generates auth URL
- **Callback** (`/callback`): Handles OAuth callback, exchanges code for access token

**Key Data Stored**:
- `access_token`: For API calls to Supabase
- `refresh_token`: For token refresh
- `supabase_project_ref`: For linking to Supabase dashboard
- `supabase_org_id`: For organization management
- `supabase_project_name`: Display name

### 3. **Real-time Backend Tool** (`ai/tools/create-realtime-backend.ts`)

AI tool that can:

- Create database tables with specified columns and types
- Enable real-time subscriptions on tables
- Create PostgreSQL functions for backend logic
- Execute raw SQL queries
- Automatically enable Row Level Security (RLS)

**Usage by AI**:
```typescript
// Example: Create a messages table with real-time enabled
createRealtimeBackend({
  action: 'create_table',
  table: {
    name: 'messages',
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false }
    ]
  }
})

// Enable real-time subscriptions
createRealtimeBackend({
  action: 'enable_realtime',
  table_name: 'messages'
})
```

### 4. **Schema Management API** (`app/api/projects/[id]/supabase-schema/`)

RESTful API for managing Supabase database schema:

- **POST**: Create tables, functions, enable real-time
- **GET**: Fetch current schema and table information

### 5. **Connection Status API** (`app/api/projects/[id]/supabase-connection/`)

Fetches Supabase connection details:
- Connection status
- Project reference
- Project name
- Organization ID

### 6. **Disconnect API** (`app/api/projects/[id]/supabase-disconnect/`)

Removes Supabase connection:
- Deletes from `supabase_connections` table
- Sets `cloud_enabled = false` on project

## Database Schema

### `supabase_connections` Table

```sql
CREATE TABLE supabase_connections (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  supabase_project_ref TEXT,
  supabase_org_id TEXT,
  supabase_project_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);
```

## How AI Uses Real-time Backend

1. **Detect backend needs**: AI identifies when application needs persistent, real-time data
2. **Create schema**: Uses `createRealtimeBackend` tool to create tables
3. **Enable real-time**: Makes tables subscribe to changes via Realtime
4. **Generate frontend**: Includes subscription code in generated frontend
5. **Full-stack integration**: Users get complete app with backend

## Example: Building a Real-time Chat App

**User Request**: "Build me a real-time chat app"

**AI Actions**:
1. Create Supabase tables (if connected):
   ```sql
   CREATE TABLE users (id uuid PRIMARY KEY, username text, avatar_url text)
   CREATE TABLE messages (id uuid PRIMARY KEY, user_id uuid, content text, created_at timestamptz)
   ```

2. Enable real-time on messages table

3. Generate frontend code with subscription:
   ```typescript
   const channel = supabase
     .channel('messages')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
       setMessages(prev => [...prev, payload.new])
     })
     .subscribe()
   ```

4. Result: User gets fully functional real-time chat with persistent storage

## Integration Points

### In Chat Component

The Chat component passes `projectId` to the AI tools:

```typescript
// User's current project ID is passed to tools
tools: tools({ modelId, writer, projectId })
```

This allows the AI to:
- Know which project to create backend for
- Make API calls to the correct endpoints
- Link Supabase resources correctly

### Environment Variables

**Required for Supabase OAuth**:
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_OAUTH_CLIENT_ID` / `NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID`: OAuth app ID
- `SUPABASE_OAUTH_CLIENT_SECRET`: OAuth app secret
- `SUPABASE_DB_URL`: Direct database connection (for schema migrations)

## Security

1. **Access Tokens**: Stored securely in database, not in frontend
2. **Row Level Security**: All generated tables have RLS enabled by default
3. **OAuth**: Uses PKCE flow for secure authorization without secrets in frontend
4. **Scopes**: OAuth requests only `openid email profile` scopes
5. **Cookies**: OAuth state/verifier stored in HTTP-only cookies

## Differences from Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| **UI** | DatabaseViewer showing table structure | ConnectionManager with quick links |
| **Backend** | Read-only database viewer | AI can create/modify schema |
| **Real-time** | Not supported | Full Realtime subscriptions |
| **Integration** | Basic connection storage | Full OAuth with project metadata |
| **AI Capabilities** | Limited to code generation | Can design backend architecture |

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh when expired
2. **RLS Policies**: Let AI generate RLS policies for security
3. **Migrations**: Store and manage migrations in version control
4. **Backup/Restore**: Backup/restore functionality in UI
5. **Monitoring**: Display database usage and performance metrics
6. **Multiple Supabase Projects**: Support connecting different Supabase projects per workspace

## Troubleshooting

### "Supabase configuration missing"
- Check that all OAuth environment variables are set
- Verify `SUPABASE_URL` and `SUPABASE_OAUTH_CLIENT_ID` are correct

### "Failed to fetch Supabase projects"
- Ensure access token is valid
- Check that the user's Supabase account has at least one project
- Verify token hasn't expired

### "Connection failed with invalid state"
- PKCE flow state mismatch (likely due to multiple tabs)
- Clear cookies and try again
- Verify OAuth redirect URL is correctly configured

### Links not working
- Check that `supabase_project_ref` is stored correctly in database
- Verify Supabase domain is correct (should be `app.supabase.com`)

## API Reference

### POST `/api/projects/[id]/supabase-schema`

Create or modify database schema:

```bash
curl -X POST /api/projects/123/supabase-schema \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_table",
    "table": {
      "name": "users",
      "columns": [
        { "name": "id", "type": "uuid", "primaryKey": true }
      ]
    }
  }'
```

### GET `/api/projects/[id]/supabase-connection`

Get connection status:

```bash
curl /api/projects/123/supabase-connection
# Response: { connected: true, projectRef: "abc123", projectName: "My App", orgId: "org-1" }
```

### POST `/api/projects/[id]/supabase-disconnect`

Disconnect Supabase:

```bash
curl -X POST /api/projects/123/supabase-disconnect
# Response: { success: true }
```

## Contributing

When adding new Supabase features:

1. Update the schema management API if adding new actions
2. Update the `createRealtimeBackend` tool if adding AI capabilities
3. Add corresponding UI in SupabaseConnectionManager if user-facing
4. Update system prompt with usage instructions for AI
5. Test end-to-end (connection → creation → usage)
