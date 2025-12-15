# Supabase OAuth Integration Guide

This document describes the complete Supabase OAuth integration that enables users to authorize the AI to access their Supabase organization and use Supabase as the backend for their projects.

## Overview

The integration follows a standard OAuth 2.0 flow with PKCE (Proof Key for Code Exchange) for security:

1. **User clicks "Supabase" button** in the workspace
2. **User authorizes** the app via Supabase OAuth dialog
3. **App receives access token** and redirects to project selection
4. **User selects** which Supabase project to use
5. **Connection is saved** with secure token storage
6. **AI has access** to Supabase for backend operations

## Environment Variables Required

Add these to your `.env.local` or deployment environment:

```env
# Supabase OAuth Configuration
SUPABASE_OAUTH_CLIENT_ID=your_oauth_client_id_from_supabase
SUPABASE_OAUTH_CLIENT_SECRET=your_oauth_client_secret_from_supabase

# Optional: If running on a custom domain, set the redirect URL
SUPABASE_OAUTH_REDIRECT_URL=https://yourapp.com/api/supabase-oauth/callback

# Existing Supabase config (should already be set)
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

## Getting Supabase OAuth Credentials

1. Go to your **Supabase Dashboard** → **Organization Settings**
2. Navigate to **OAuth Applications** (or similar section)
3. Create a new OAuth application
4. Set **Redirect URL** to: `https://yourapp.com/api/supabase-oauth/callback`
   - For development: `http://localhost:3000/api/supabase-oauth/callback`
5. Copy the **Client ID** and **Client Secret**
6. Add them to your environment variables

## File Structure

### API Routes

- `app/api/supabase-oauth/start/route.ts` - Initiates OAuth flow with PKCE
- `app/api/supabase-oauth/callback/route.ts` - Handles OAuth callback and token exchange
- `app/api/supabase-oauth/projects/route.ts` - Fetches user's Supabase projects
- `app/api/supabase-oauth/select/route.ts` - Saves selected Supabase project
- `app/api/supabase-oauth/disconnect/route.ts` - Disconnects Supabase from workspace
- `app/api/supabase-oauth/status/route.ts` - Checks connection status and handles token refresh

### UI Components

- `components/supabase-connect/supabase-oauth-button.tsx` - Button in workspace toolbar
- `components/supabase-connect/supabase-connection-manager.tsx` - Connection status display
- `app/supabase-oauth-select/page.tsx` - Project selection page after OAuth

### Database & Utilities

- `lib/supabase-projects-db.ts` - Database operations for storing/retrieving connections
- `ai/tools/supabase-helper.ts` - Helper functions for AI to interact with Supabase

### AI Tools

- `ai/tools/index.ts` - Updated to pass Supabase context to tools
- `app/api/chat/route.ts` - Fetches and passes Supabase connection to AI

## Database Schema

The app automatically creates this table in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS supabase_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,              -- App workspace ID
  supabase_project_ref TEXT NOT NULL,    -- Project slug/ref
  supabase_org_id TEXT,                  -- Organization ID
  supabase_project_name TEXT,            -- Project display name
  access_token TEXT NOT NULL,            -- OAuth access token (encrypted)
  refresh_token TEXT,                    -- OAuth refresh token (encrypted)
  expires_at TIMESTAMPTZ,                -- Token expiration time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX supabase_projects_user_project_idx 
  ON supabase_projects(user_id, project_id);
```

## Features

### OAuth Security

- ✅ **PKCE Flow** - Code exchange verified with code challenge
- ✅ **State Validation** - CSRF protection via state parameter
- ✅ **Secure Cookies** - Tokens stored in httpOnly cookies
- ✅ **Token Refresh** - Automatic token refresh when expired
- ✅ **User Verification** - Validates user hasn't changed during OAuth flow

### Connection Management

- ✅ **Per-Workspace Connections** - Each app can use different Supabase project
- ✅ **Connection Status** - Visual indicator showing connection state
- ✅ **Automatic Refresh** - Tokens refreshed transparently
- ✅ **Easy Disconnect** - Users can disconnect at any time

### AI Integration

- ✅ **Supabase Context** - AI knows which Supabase project is connected
- ✅ **Database Operations** - AI can create tables, manage schemas, set up RLS
- ✅ **Realtime Support** - AI can enable realtime subscriptions
- ✅ **Auth Integration** - AI can set up authentication policies

## Testing Checklist

### 1. OAuth Flow

- [ ] Click "Supabase" button in workspace
- [ ] Redirected to Supabase OAuth login/authorization page
- [ ] Accept permissions and return to app
- [ ] See project selection page with list of your Supabase projects
- [ ] Can search and filter projects
- [ ] Select a project and click "Connect"
- [ ] Redirected back to workspace
- [ ] "Supabase" button shows "Connected" status
- [ ] Connection dropdown shows project name and details

### 2. Connection Status

- [ ] Hover over "Connected" button to see dropdown menu
- [ ] Dropdown shows:
  - Project name
  - Project ref (slug)
  - Token expiration date
- [ ] "Reconnect" button works (re-opens OAuth flow)
- [ ] "Disconnect" button removes connection

### 3. Token Refresh

- [ ] Check connection status API shows token details
- [ ] Wait for token to near expiration (or test with mock token)
- [ ] Make API call to status endpoint
- [ ] Token should be automatically refreshed
- [ ] Expiration date updates in connection status

### 4. Multiple Workspaces

- [ ] Create two apps/workspaces
- [ ] Connect Workspace A to Supabase Project 1
- [ ] Connect Workspace B to Supabase Project 2
- [ ] Verify each workspace shows its own connection
- [ ] Switch between workspaces, connections persist

### 5. AI Integration

- [ ] Give AI a prompt that requires backend (e.g., "Create a user authentication system")
- [ ] Verify AI has Supabase context in system prompt
- [ ] AI should be able to:
  - [ ] Create database tables
  - [ ] Define schemas
  - [ ] Set up Row Level Security (RLS)
  - [ ] Enable realtime
  - [ ] Create auth policies

### 6. Error Handling

- [ ] Test with invalid OAuth credentials in env
- [ ] Test with expired/revoked token
- [ ] Verify user-friendly error messages
- [ ] Test network failures during OAuth flow
- [ ] Test canceling OAuth authorization

### 7. Edge Cases

- [ ] User has no Supabase projects
- [ ] User switches to different Supabase organization
- [ ] User revokes access in Supabase dashboard
- [ ] Multiple users on same workspace (permissions)
- [ ] Switching between apps quickly

## API Endpoints

### Start OAuth Flow
```
GET /api/supabase-oauth/start?appProjectId=PROJECT_ID
```
Initiates PKCE OAuth flow. Redirects to Supabase authorization endpoint.

**Response:** Redirects to Supabase OAuth dialog

### OAuth Callback
```
GET /api/supabase-oauth/callback?code=CODE&state=STATE
```
Handles OAuth callback from Supabase.

**Response:** Redirects to `/supabase-oauth-select` with tokens in URL params

### Fetch Projects
```
GET /api/supabase-oauth/projects
Headers: x-supabase-access-token: ACCESS_TOKEN
```
Fetches user's Supabase projects using the access token.

**Response:**
```json
{
  "projects": [
    {
      "ref": "project-ref",
      "id": "project-id",
      "name": "Project Name",
      "region": "us-east-1",
      "organizationId": "org-id"
    }
  ]
}
```

### Select Project
```
POST /api/supabase-oauth/select
Content-Type: application/json

{
  "appProjectId": "app-project-id",
  "supabaseProjectRef": "project-ref",
  "supabaseProjectName": "Project Name",
  "supabaseOrgId": "org-id",
  "accessToken": "access-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600
}
```
Saves the selected Supabase project connection.

**Response:**
```json
{
  "success": true,
  "connection": {
    "projectRef": "project-ref",
    "projectName": "Project Name",
    "organizationId": "org-id"
  }
}
```

### Check Status
```
GET /api/supabase-oauth/status?projectId=PROJECT_ID
```
Checks if a workspace has an active Supabase connection. Handles token refresh if needed.

**Response:**
```json
{
  "connected": true,
  "projectRef": "project-ref",
  "projectName": "Project Name",
  "organizationId": "org-id",
  "expiresAt": "2024-01-15T10:30:00Z",
  "connectedAt": "2024-01-08T10:30:00Z"
}
```

### Disconnect
```
POST /api/supabase-oauth/disconnect
Content-Type: application/json

{
  "projectId": "app-project-id"
}
```
Disconnects the Supabase connection for a workspace.

**Response:**
```json
{
  "success": true,
  "message": "Supabase project disconnected"
}
```

## Supabase Helper Functions

Available in `ai/tools/supabase-helper.ts`:

- `executeSupabaseSQL(connection, sql)` - Execute arbitrary SQL
- `createTable(connection, params)` - Create a new table with RLS
- `createRLSPolicy(connection, params)` - Add Row Level Security policy
- `dropTable(connection, tableName)` - Drop a table
- `addColumn(connection, tableName, columnName, type, constraints)` - Add column
- `createIndex(connection, tableName, indexName, columns, unique)` - Create index
- `enableRealtimePublication(connection, tableName)` - Enable realtime on table
- `createAuthFunction(connection, functionName, body)` - Create PL/pgSQL function
- `listTables(connection)` - List all tables in public schema
- `getTableSchema(connection, tableName)` - Get table column definitions

## Troubleshooting

### "Supabase OAuth not configured"

**Cause:** Missing `SUPABASE_OAUTH_CLIENT_ID` or `SUPABASE_OAUTH_CLIENT_SECRET` env vars

**Fix:** Add them to your environment and restart the dev server

### "Invalid or expired Supabase access token"

**Cause:** Token expired or revoked

**Fix:** User needs to reconnect their Supabase project

### OAuth redirect loop

**Cause:** Redirect URL mismatch between app and Supabase settings

**Fix:** Ensure `SUPABASE_OAUTH_REDIRECT_URL` matches Supabase OAuth settings exactly

### "User ID mismatch"

**Cause:** User changed between starting and completing OAuth flow

**Fix:** Rare edge case - user should retry the OAuth flow

### Connection not persisting

**Cause:** Database table not created or connection not saved properly

**Fix:** Check database URL and verify `supabase_projects` table exists

## Architecture Decisions

- **PKCE Flow:** Used for enhanced security even though this is not a public client
- **Per-Workspace Connections:** Allows flexibility - users can connect different Supabase projects to different apps
- **Token Refresh:** Automatic and transparent - stored in database with expiration time
- **Supabase Admin API:** Access token used for administrative operations like creating tables
- **RLS by Default:** Tables can be created with RLS enabled automatically

## Future Enhancements

- [ ] Support for connecting multiple Supabase organizations to single user
- [ ] UI to manage multiple connected projects
- [ ] Automatic schema backup before AI modifications
- [ ] Real-time schema change notifications
- [ ] Access logs for Supabase operations
- [ ] Team/organization-level Supabase connections
- [ ] Custom domain/self-hosted Supabase support
