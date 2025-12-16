# Supabase AI Database Access Implementation

## Overview

This implementation enables the AI to automatically access and operate on the user's connected Supabase database, similar to Lovable's functionality. Users can:

1. Connect their Supabase project
2. Have the AI automatically execute database operations
3. Create tables, insert/update/delete data, run migrations
4. Generate code that works with the live database

---

## Architecture

### Flow Diagram

```
User connects Supabase
      ↓
Chat API (app/api/chat/route.ts) detects connection
      ↓
Fetches connection credentials from database
      ↓
Passes SupabaseConnectionInfo to AI tools
      ↓
AI can now use database operations tools
      ↓
Tools execute queries directly on user's database
      ↓
Results returned to user
```

---

## Files Created & Modified

### Created Files

1. **`ai/tools/database-operations.ts`** (571 lines)
   - Comprehensive database operations tool
   - Functions: executeQuery, createTable, insertData, updateData, deleteData, listTables, getTableSchema, runMigration
   - All functions handle Supabase connection and provide user feedback
   - Includes proper error handling and result formatting

2. **`ai/tools/database-operations.md`** (460 lines)
   - Complete documentation for database operations
   - Describes each operation with parameters and examples
   - Best practices and common patterns
   - Error handling guidance
   - Integration tips for code generation

3. **`SUPABASE_AI_DATABASE_ACCESS_IMPLEMENTATION.md`** (this file)
   - Implementation overview
   - Testing guide
   - Usage examples

### Modified Files

1. **`ai/tools/index.ts`**
   - Added import for `databaseOperations`
   - Registered database operations in tools export
   - Tools now include: createSandbox, generateFiles, getSandboxURL, runCommand, createRealtimeBackend, createDatabase, **executeQuery, createTable, insertData, updateData, deleteData, listTables, getTableSchema, runMigration**

2. **`app/api/chat/prompt.md`**
   - Added "CONNECTED SUPABASE DATABASE ACCESS" section
   - Documented available database operations
   - Usage guidelines and workflow examples
   - AI now understands it can use these tools automatically

---

## How It Works

### Step 1: User Connects Supabase

User clicks "Connect Supabase" and goes through OAuth flow, storing:
- `access_token` (encrypted)
- `projectRef` (project ID)
- `projectName`
- `anonKey`
- `supabaseUrl` (optional)

Data stored in `supabase_projects` table in the app's database.

### Step 2: Chat Request with Connected Supabase

When user sends a message:

```typescript
// In app/api/chat/route.ts
if (supabaseConnected) {
  const supabaseProject = await getSupabaseProject(userId, projectId)
  if (supabaseProject?.access_token) {
    supabaseConnectionInfo = {
      accessToken: supabaseProject.access_token,
      projectRef: supabaseProject.supabase_project_ref,
      projectName: supabaseProject.supabase_project_name,
      // ... other fields
    }
  }
}
```

### Step 3: AI Gets Database Tools

```typescript
// In tools function
...databaseOperations({
  writer,
  supabaseConnection,
})
```

The AI now has access to database operations without additional configuration.

### Step 4: AI Executes Database Operations

AI can now:
- Check what tables exist: `listTables()`
- Inspect table schema: `getTableSchema({ tableName: 'users' })`
- Execute queries: `executeQuery({ query: 'SELECT * FROM users' })`
- Create tables: `createTable({ tableName: 'posts', columns: [...] })`
- Modify data: `insertData()`, `updateData()`, `deleteData()`
- Run migrations: `runMigration({ sql: '...' })`

### Step 5: Results Returned to User

Each operation returns:
- Success/failure status
- Result data (for queries)
- Error messages (if failed)
- User-friendly feedback message

---

## Testing Guide

### Prerequisites

1. User must be authenticated (Clerk)
2. User must have a Supabase account and created a project
3. User must have connected Supabase to the platform (via OAuth)
4. The project must have `supabaseConnected: true` in the request

### Test Case 1: List Existing Tables

**Request**:
```
"What tables do I have in my database?"
```

**Expected AI Action**:
1. Call `listTables()` tool
2. Display table names to user
3. Suggest next steps (inspect schema, query data, etc.)

**Expected Output**:
```
✓ Database tables: users, posts, comments
```

### Test Case 2: Create New Table

**Request**:
```
"Create a table for blog posts with id, title, content, and created_at fields"
```

**Expected AI Action**:
1. Call `createTable` with appropriate schema
2. Set up UUID primary key with auto-generation
3. Set created_at with NOW() default
4. Enable RLS on the table

**Expected Output**:
```
✓ Table "posts" created successfully with RLS enabled.
```

### Test Case 3: Insert Data

**Request**:
```
"Add a post to the database with title 'Hello World' and content 'This is my first post'"
```

**Expected AI Action**:
1. Call `insertData` with tableName, data
2. Handle proper SQL escaping
3. Return inserted row with RETURNING *

**Expected Output**:
```
✓ Data inserted successfully.
Inserting data into "posts"
```

### Test Case 4: Query Data

**Request**:
```
"Show me all published posts from the database"
```

**Expected AI Action**:
1. Call `executeQuery` with SELECT query
2. Format results for display
3. Show relevant information to user

**Expected Output**:
```
✓ Query executed successfully.
Executing database query

Result: [
  { id: "uuid", title: "Hello World", content: "...", published: true },
  ...
]
```

### Test Case 5: Generate App with Database

**Request**:
```
"Create a todo app that saves todos to my database"
```

**Expected AI Actions**:
1. Call `createTable` to set up todos table
2. Call `generateFiles` to create Next.js app
3. Generated code uses Supabase client to connect
4. App can immediately save/load todos

**Expected Output**:
- Todos table created
- Next.js app files generated
- App connects to user's database automatically

### Test Case 6: Run Migration

**Request**:
```
"Add an 'updated_at' column to my posts table and create an index on title"
```

**Expected AI Action**:
1. Call `runMigration` with multi-statement SQL
2. Execute ALTER TABLE and CREATE INDEX
3. Confirm changes

**Expected Output**:
```
✓ Migration completed successfully.
Adding audit columns and indexes
```

---

## Implementation Checklist

- [x] Created `database-operations.ts` with all CRUD operations
- [x] Registered tool in `ai/tools/index.ts`
- [x] Updated chat route to pass `supabaseConnectionInfo`
- [x] Updated `app/api/chat/prompt.md` with database operation guidance
- [x] Created comprehensive documentation (`database-operations.md`)
- [x] Added error handling and user feedback
- [x] Implemented proper SQL escaping and parameterization
- [x] Added RLS enabling on new tables
- [x] Support for complex migrations

---

## API Reference

### Tool: executeQuery

Execute arbitrary SQL queries.

```typescript
const result = await executeQuery({
  query: 'SELECT * FROM users WHERE id = $1',
  description: 'Fetching user profile'
})
```

### Tool: createTable

Create a new table with columns.

```typescript
const result = await createTable({
  tableName: 'todos',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
    { name: 'title', type: 'text', nullable: false },
    { name: 'completed', type: 'boolean', default: 'false' }
  ]
})
```

### Tool: insertData

Insert rows into a table.

```typescript
const result = await insertData({
  tableName: 'todos',
  data: { title: 'Buy milk', completed: false }
})
```

### Tool: updateData

Update rows in a table.

```typescript
const result = await updateData({
  tableName: 'todos',
  data: { completed: true },
  where: { id: 'some-uuid' }
})
```

### Tool: deleteData

Delete rows from a table.

```typescript
const result = await deleteData({
  tableName: 'todos',
  where: { id: 'some-uuid' }
})
```

### Tool: listTables

List all tables in the database.

```typescript
const result = await listTables()
// { success: true, tables: ['users', 'posts'] }
```

### Tool: getTableSchema

Inspect a table's schema.

```typescript
const result = await getTableSchema({ tableName: 'users' })
// { 
//   success: true, 
//   schema: {
//     id: { type: 'uuid', nullable: false },
//     email: { type: 'text', nullable: false }
//   }
// }
```

### Tool: runMigration

Execute multi-statement SQL migrations.

```typescript
const result = await runMigration({
  sql: `
    ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT false;
    CREATE INDEX users_email_idx ON users(email);
  `
})
```

---

## Security Considerations

1. **Token Encryption**: Access tokens are encrypted using `OAUTH_TOKEN_ENCRYPTION_KEY`
2. **Server-Side Execution**: All SQL queries execute on the backend, not client-side
3. **User Isolation**: Each user only accesses their own Supabase database
4. **SQL Injection Prevention**: Values are properly quoted and escaped
5. **Error Messages**: Safe error messages returned (don't expose sensitive DB details)
6. **No Secrets Exposed**: API keys and tokens never logged or exposed to users

---

## Future Enhancements

Potential improvements:
1. **Query Builder**: Generate SQL from natural language more safely
2. **Schema Validation**: Validate columns/types before operations
3. **Rate Limiting**: Limit database operations per user/time
4. **Audit Logging**: Track all database operations
5. **Rollback Support**: Ability to undo failed migrations
6. **Backup Integration**: Automatic backups before major operations
7. **Real-Time Subscriptions**: AI can set up real-time listeners
8. **Performance Optimization**: Analyze slow queries and suggest indexes

---

## Troubleshooting

### Issue: "No Supabase database connected"

**Cause**: User hasn't connected Supabase or connection info wasn't passed to AI

**Solution**:
1. Check user has clicked "Connect Supabase"
2. Check project has `supabaseConnected: true`
3. Verify chat route is passing `supabaseConnectionInfo`

### Issue: "relation does not exist"

**Cause**: Table name is wrong, misspelled, or doesn't exist

**Solution**:
1. Use `listTables()` to see actual table names
2. Remember PostgreSQL is case-sensitive for unquoted names
3. Check if table is in the correct schema (public)

### Issue: "column does not exist"

**Cause**: Column name is wrong or different from expected

**Solution**:
1. Use `getTableSchema()` to inspect actual columns
2. Check column names match exactly
3. Use quoted identifiers for safety

### Issue: "permission denied"

**Cause**: RLS policy or database role restriction

**Solution**:
1. Check user's database role has appropriate permissions
2. Verify RLS policies allow the operation
3. May need to adjust database security settings

### Issue: Query times out

**Cause**: Query is too complex or table is very large

**Solution**:
1. Add LIMIT to SELECT queries: `SELECT * FROM users LIMIT 100;`
2. Use WHERE clauses to filter results
3. Add indexes on frequently queried columns

---

## Summary

The AI now has full database access when Supabase is connected:

✅ **Automatic Detection**: AI detects when database is available
✅ **Direct Queries**: Execute any SQL directly
✅ **Schema Management**: Create/modify tables and schema
✅ **Data Operations**: Insert, update, delete data
✅ **Migrations**: Run complex multi-statement migrations
✅ **Integration**: Generated code automatically uses the database
✅ **User Feedback**: Clear feedback on all operations
✅ **Error Handling**: Graceful error handling with helpful messages
✅ **Security**: Encrypted tokens, server-side execution, user isolation

This brings the platform to feature parity with Lovable's database integration.
