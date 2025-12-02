declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<unknown>;
    end(): Promise<void>;
    query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  }
}
