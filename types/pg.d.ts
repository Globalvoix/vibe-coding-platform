declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string
    host?: string
    port?: number
    database?: string
    user?: string
    password?: string
    ssl?: boolean | object
    application_name?: string
    fallback_application_name?: string
    statement_timeout?: number
    query_timeout?: number
    replication?: string
  }

  export interface QueryResult<T = Record<string, unknown>> {
    command: string
    rowCount: number | null
    oid: number | null
    rows: T[]
    fields: Array<{
      name: string
      tableID: number
      columnID: number
      dataTypeID: number
      dataTypeSize: number
      dataTypeModifier: number
      format: string
    }>
    _parsers: unknown[]
    _types: unknown
    RowCtor: unknown
  }

  export interface PoolClient {
    query<T = Record<string, unknown>>(
      queryTextOrConfig: string | { text: string; values?: unknown[] },
      values?: unknown[]
    ): Promise<QueryResult<T>>
    release(err?: Error): void
  }

  export class Pool {
    constructor(config?: PoolConfig)
    query<T = Record<string, unknown>>(
      queryTextOrConfig: string | { text: string; values?: unknown[] },
      values?: unknown[]
    ): Promise<QueryResult<T>>
    connect(): Promise<PoolClient>
    end(): Promise<void>
    on(event: string, listener: (...args: unknown[]) => void): this
  }

  export { Pool as default }
}
