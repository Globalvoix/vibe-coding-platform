# Database Operations Tool

This tool provides direct access to the user's connected Supabase database, allowing you to create tables, run migrations, and execute queries (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.).

## Prerequisites

The user must have:
1. Connected a Supabase project to the platform
2. Authorized the AI to access their database
3. The connection info will be passed automatically in the chat context

If Supabase is not connected, the database operations will return an error message.

## Available Operations

### 1. executeQuery

Execute arbitrary SQL queries on the database.

**When to use**:
- Running SELECT queries to fetch data
- Running INSERT/UPDATE/DELETE mutations
- Creating tables, views, functions
- Any custom SQL

**Parameters**:
```typescript
{
  query: string          // The SQL query to execute
  description?: string   // Optional description of what the query does (shown to user)
}
```

**Returns**:
```typescript
{
  success: boolean
  result?: unknown      // Query results (array of rows for SELECT, etc.)
  error?: string        // Error message if failed
  rowsAffected?: number // Number of rows affected (for mutations)
}
```

**Example**:
```typescript
// Fetch all users
const result = await executeQuery({
  query: 'SELECT * FROM users;',
  description: 'Fetching all users from the database'
})

// Insert a new user
const result = await executeQuery({
  query: `INSERT INTO users (email, name) VALUES ('user@example.com', 'John Doe') RETURNING *;`,
  description: 'Creating a new user'
})
```

### 2. createTable

Create a new table with specified columns and constraints.

**When to use**:
- User requests a table for a new feature
- Setting up database schema for an application
- Creating tables with RLS (Row Level Security) enabled

**Parameters**:
```typescript
{
  tableName: string
  columns: Array<{
    name: string
    type: string              // PostgreSQL type (text, integer, boolean, uuid, timestamp, etc.)
    nullable?: boolean        // Default: true
    primaryKey?: boolean      // Default: false
    unique?: boolean          // Default: false
    default?: string          // Default value (e.g., 'now()', 'uuid_generate_v4()')
  }>
  description?: string        // Optional description
}
```

**Returns**:
```typescript
{
  success: boolean
  error?: string
}
```

**Example**:
```typescript
const result = await createTable({
  tableName: 'todos',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
    { name: 'title', type: 'text', nullable: false },
    { name: 'completed', type: 'boolean', default: 'false' },
    { name: 'created_at', type: 'timestamp', default: 'now()' }
  ],
  description: 'Creating todos table with UUID primary key'
})
```

### 3. getTableSchema

Inspect the schema of an existing table to understand its structure.

**When to use**:
- Before querying a table you're unfamiliar with
- Understanding what columns and types exist
- Planning INSERT/UPDATE operations

**Parameters**:
```typescript
{
  tableName: string
}
```

**Returns**:
```typescript
{
  success: boolean
  schema?: Record<string, {
    type: string          // Data type (text, integer, etc.)
    nullable: boolean     // Whether column allows NULL
    default: string | null // Default value if any
  }>
  error?: string
}
```

**Example**:
```typescript
const result = await getTableSchema({ tableName: 'users' })
// Returns something like:
// {
//   id: { type: 'uuid', nullable: false, default: 'uuid_generate_v4()' },
//   email: { type: 'text', nullable: false, default: null },
//   name: { type: 'text', nullable: true, default: null }
// }
```

### 4. listTables

List all tables in the connected database.

**When to use**:
- Understanding what tables exist in the database
- Planning which tables to query or modify
- Checking if a table already exists

**Parameters**: None

**Returns**:
```typescript
{
  success: boolean
  tables?: string[]  // Array of table names
  error?: string
}
```

**Example**:
```typescript
const result = await listTables()
// Returns: { success: true, tables: ['users', 'todos', 'posts'] }
```

### 5. insertData

Insert data into a table (simpler than raw executeQuery for INSERT operations).

**When to use**:
- Adding new rows to a table
- User provides specific data to save

**Parameters**:
```typescript
{
  tableName: string
  data: Record<string, unknown>  // Column names and values to insert
  description?: string
}
```

**Returns**:
```typescript
{
  success: boolean
  result?: unknown  // The inserted row(s) with RETURNING *
  error?: string
}
```

**Example**:
```typescript
const result = await insertData({
  tableName: 'users',
  data: {
    email: 'john@example.com',
    name: 'John Doe',
    age: 30
  },
  description: 'Creating a new user record'
})
```

### 6. updateData

Update existing rows in a table.

**When to use**:
- Modifying existing records
- Bulk updates with WHERE conditions

**Parameters**:
```typescript
{
  tableName: string
  data: Record<string, unknown>  // New values for columns
  where?: Record<string, unknown> // Conditions (WHERE clause)
  description?: string
}
```

**Returns**:
```typescript
{
  success: boolean
  result?: unknown  // Updated row(s)
  error?: string
}
```

**Example**:
```typescript
const result = await updateData({
  tableName: 'users',
  data: { name: 'Jane Doe', age: 31 },
  where: { email: 'john@example.com' },
  description: 'Updating user information'
})
```

### 7. deleteData

Delete rows from a table.

**When to use**:
- Removing records from a table
- Cleanup operations

**Parameters**:
```typescript
{
  tableName: string
  where?: Record<string, unknown>  // Conditions (WHERE clause)
  description?: string
}
```

**Returns**:
```typescript
{
  success: boolean
  rowsDeleted?: number
  error?: string
}
```

**Example**:
```typescript
const result = await deleteData({
  tableName: 'users',
  where: { id: 'some-uuid' },
  description: 'Deleting a user record'
})
```

### 8. runMigration

Execute one or more SQL statements as a migration.

**When to use**:
- Complex schema changes
- Multiple related statements that should be executed together
- Running migration scripts

**Parameters**:
```typescript
{
  sql: string  // Multiple SQL statements separated by semicolons
  description?: string
}
```

**Returns**:
```typescript
{
  success: boolean
  error?: string
}
```

**Example**:
```typescript
const result = await runMigration({
  sql: `
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT now();
    CREATE INDEX users_email_idx ON users(email);
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  `,
  description: 'Adding audit columns and security'
})
```

## Best Practices

### 1. Always Inspect Before Querying
```typescript
// First, check what tables exist
const tables = await listTables()

// Then check the schema of the table you'll query
const schema = await getTableSchema({ tableName: 'users' })

// Now execute your query safely
const result = await executeQuery({
  query: 'SELECT * FROM users LIMIT 10;'
})
```

### 2. Use Proper SQL Syntax
- Always quote identifiers: `"table_name"`, `"column_name"`
- Use proper escaping for string values
- Remember PostgreSQL is case-sensitive for unquoted names

### 3. Handle Errors Gracefully
- Always check the `success` flag
- Display error messages to users when operations fail
- Suggest corrections if there are schema mismatches

### 4. Explain Operations to Users
- Use the `description` parameter to explain what you're doing
- After operations, summarize the results
- Tell users what was created, modified, or deleted

## Common Patterns

### Setup a New Table for an App
```typescript
// 1. Create the table
await createTable({
  tableName: 'posts',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'title', type: 'text', nullable: false },
    { name: 'content', type: 'text' },
    { name: 'published', type: 'boolean', default: 'false' },
    { name: 'created_at', type: 'timestamp', default: 'now()' }
  ],
  description: 'Creating posts table for blogging app'
})

// 2. Add some sample data
await insertData({
  tableName: 'posts',
  data: {
    user_id: 'some-user-uuid',
    title: 'My First Post',
    content: 'This is the content...'
  },
  description: 'Inserting sample post'
})

// 3. Query the data
const result = await executeQuery({
  query: 'SELECT * FROM posts WHERE published = true;',
  description: 'Fetching published posts'
})
```

### Add Authentication Column to Existing Table
```typescript
await executeQuery({
  query: `
    ALTER TABLE users ADD COLUMN auth_id UUID;
    CREATE INDEX users_auth_idx ON users(auth_id);
  `,
  description: 'Adding authentication column to users table'
})
```

### Complex Data Migration
```typescript
await runMigration({
  sql: `
    -- Create new table with updated schema
    CREATE TABLE users_new (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    
    -- Copy data from old table
    INSERT INTO users_new (email, name, created_at)
    SELECT email, name, created_at FROM users;
    
    -- Drop old table and rename
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `,
  description: 'Migrating users table to new schema'
})
```

## Limitations

- The database is real-time, so changes are immediate
- Row-level security (RLS) policies can restrict what you can access
- Some system tables cannot be modified
- Very large queries might timeout

## Error Handling

Common errors and how to handle them:

**"relation does not exist"** → Table name is wrong or misspelled
- Use `listTables()` to verify the correct name
- Remember PostgreSQL is case-sensitive for unquoted names

**"column does not exist"** → Column name is wrong or table schema is different
- Use `getTableSchema()` to check available columns
- Adjust your query to use existing columns

**"permission denied"** → RLS policy or database user permissions issue
- This is a security feature, may need user to adjust database policies
- Or user needs to allow broader database access

**"syntax error in SQL"** → Query has invalid SQL syntax
- Review the query for typos or missing quotes
- Test with a simpler query first

## Integration with Codegen

When generating applications that need data persistence:

1. **Detect database need** in user request
2. **Create schema** using `createTable` (if table doesn't exist)
3. **Generate frontend code** with Supabase client
4. **Add seed data** using `insertData` if examples needed
5. **Verify schema** using `getTableSchema`

The generated code will automatically work with the tables you created.
