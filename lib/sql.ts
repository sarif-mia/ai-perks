export interface SqlResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}
export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<SqlResult<T>>;
  run(): Promise<SqlResult>;
}
export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}
export function postgresSQL(sql: string) {
  let index = 0;
  let query = sql
    .replace(/\?/g, () => "$" + ++index)
    .replace(
      /json_extract\(payload,\s*'\$\.([a-zA-Z]+)'\)/g,
      "(payload::jsonb ->> '$1')",
    );
  query = query.replace(
    /\bAS\s+([a-zA-Z][a-zA-Z0-9]*)/g,
    (_, name) => `AS "${name}"`,
  );
  if (/^INSERT OR IGNORE INTO workspaces/i.test(query))
    query =
      query.replace("INSERT OR IGNORE INTO", "INSERT INTO") +
      " ON CONFLICT (owner_id) DO NOTHING";
  return query;
}
