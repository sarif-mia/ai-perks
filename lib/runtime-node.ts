import { neon } from "@neondatabase/serverless";
import type { SqlDatabase, SqlStatement, SqlResult } from "./sql";
import { postgresSQL } from "./sql";
class Statement implements SqlStatement {
  values: unknown[] = [];
  constructor(
    public db: PostgresDatabase,
    public sql: string,
  ) {}
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  query() {
    return this.db.client.query(postgresSQL(this.sql), this.values);
  }
  async first<T>() {
    return ((await this.query()).rows[0] as T) || null;
  }
  async all<T>(): Promise<SqlResult<T>> {
    const result = await this.query();
    return {
      results: result.rows as T[],
      meta: { changes: result.rowCount || 0 },
    };
  }
  async run() {
    return this.all<Record<string, unknown>>();
  }
}
class PostgresDatabase implements SqlDatabase {
  client;
  constructor(url: string) {
    this.client = neon(url, { fullResults: true });
  }
  prepare(sql: string) {
    return new Statement(this, sql);
  }
  async batch(statements: SqlStatement[]) {
    const queries = statements.map((s) => {
      const q = s as Statement;
      return this.client.query(postgresSQL(q.sql), q.values);
    });
    const results = await this.client.transaction(queries);
    return results.map((r) => ({
      results: r.rows as Record<string, unknown>[],
      meta: { changes: r.rowCount || 0 },
    }));
  }
}
let database: PostgresDatabase | undefined;
export function runtime() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url && !database) database = new PostgresDatabase(url);
  return { ...process.env, DB: database } as {
    DB?: SqlDatabase;
    [key: string]: unknown;
  };
}
