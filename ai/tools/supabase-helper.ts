import { getSupabaseDatabaseQueryUrl } from '@/lib/supabase-platform'

interface SupabaseConnection {
  accessToken: string
  projectRef: string
  supabaseUrl?: string
}

interface CreateTableParams {
  tableName: string
  schema: Record<string, string>
  rls?: boolean
}

interface CreateAuthPolicyParams {
  tableName: string
  policyName: string
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
  usingExpression?: string
  withCheckExpression?: string
}

function unwrapQueryResult(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return payload

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.result)) return record.result
  if (Array.isArray(record.data)) return record.data
  if (record.result && typeof record.result === 'object') return record.result

  return payload
}

export async function executeSupabaseSQL(
  connection: SupabaseConnection,
  sql: string
): Promise<unknown> {
  const response = await fetch(getSupabaseDatabaseQueryUrl(connection.projectRef), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to execute SQL (${response.status}): ${error}`)
  }

  const payload = (await response.json()) as unknown
  return unwrapQueryResult(payload)
}

export async function createTable(
  connection: SupabaseConnection,
  params: CreateTableParams
): Promise<void> {
  const columns = Object.entries(params.schema)
    .map(([name, type]) => `"${name}" ${type}`)
    .join(', ')

  const sql = `
    CREATE TABLE IF NOT EXISTS "${params.tableName}" (
      ${columns}
    );
  `

  await executeSupabaseSQL(connection, sql)

  if (params.rls) {
    const rlsSql = `
      ALTER TABLE "${params.tableName}" ENABLE ROW LEVEL SECURITY;
    `
    await executeSupabaseSQL(connection, rlsSql)
  }
}

export async function createRLSPolicy(
  connection: SupabaseConnection,
  params: CreateAuthPolicyParams
): Promise<void> {
  const usingClause = params.usingExpression ? `USING (${params.usingExpression})` : ''
  const withCheckClause = params.withCheckExpression
    ? `WITH CHECK (${params.withCheckExpression})`
    : ''

  const sql = `
    CREATE POLICY "${params.policyName}"
    ON "${params.tableName}"
    FOR ${params.action}
    ${usingClause}
    ${withCheckClause};
  `

  await executeSupabaseSQL(connection, sql)
}

export async function dropTable(
  connection: SupabaseConnection,
  tableName: string,
  cascade: boolean = false
): Promise<void> {
  const cascadeClause = cascade ? 'CASCADE' : 'RESTRICT'
  const sql = `DROP TABLE IF EXISTS "${tableName}" ${cascadeClause};`

  await executeSupabaseSQL(connection, sql)
}

export async function addColumn(
  connection: SupabaseConnection,
  tableName: string,
  columnName: string,
  columnType: string,
  constraints?: string
): Promise<void> {
  const constraintsClause = constraints ? ` ${constraints}` : ''
  const sql = `
    ALTER TABLE "${tableName}"
    ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}${constraintsClause};
  `

  await executeSupabaseSQL(connection, sql)
}

export async function createIndex(
  connection: SupabaseConnection,
  tableName: string,
  indexName: string,
  columns: string[],
  unique: boolean = false
): Promise<void> {
  const uniqueClause = unique ? 'UNIQUE' : ''
  const columnList = columns.map((col) => `"${col}"`).join(', ')

  const sql = `
    CREATE ${uniqueClause} INDEX IF NOT EXISTS "${indexName}"
    ON "${tableName}" (${columnList});
  `

  await executeSupabaseSQL(connection, sql)
}

export async function enableRealtimePublication(
  connection: SupabaseConnection,
  tableName: string
): Promise<void> {
  const sql = `
    ALTER PUBLICATION supabase_realtime ADD TABLE "${tableName}";
  `

  await executeSupabaseSQL(connection, sql)
}

export async function createAuthFunction(
  connection: SupabaseConnection,
  functionName: string,
  functionBody: string
): Promise<void> {
  const sql = `
    CREATE OR REPLACE FUNCTION ${functionName}()
    RETURNS void AS $$
    BEGIN
      ${functionBody}
    END;
    $$ LANGUAGE plpgsql;
  `

  await executeSupabaseSQL(connection, sql)
}

export async function listTables(connection: SupabaseConnection): Promise<string[]> {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `

  const result = (await executeSupabaseSQL(connection, sql)) as Array<{
    table_name: string
  }>
  return result.map((row) => row.table_name)
}

export async function getTableSchema(
  connection: SupabaseConnection,
  tableName: string
): Promise<Record<string, string>> {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `

  const result = (await executeSupabaseSQL(connection, sql)) as Array<{
    column_name: string
    data_type: string
  }>

  return result.reduce(
    (acc, row) => {
      acc[row.column_name] = row.data_type
      return acc
    },
    {} as Record<string, string>
  )
}
