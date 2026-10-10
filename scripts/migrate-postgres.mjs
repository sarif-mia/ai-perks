import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url)
  throw new Error(
    "Configure DATABASE_URL before running the Postgres migration.",
  );
const sql = neon(url);
await sql.query(
  "CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)",
);
for (const file of readdirSync(new URL("../db/postgres/", import.meta.url))
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  const source = readFileSync(
      new URL("../db/postgres/" + file, import.meta.url),
      "utf8",
    ),
    hash = createHash("sha256").update(source).digest("hex");
  const rows = await sql.query(
    "SELECT hash FROM app_migrations WHERE name=$1",
    [file],
  );
  if (rows.length) {
    if (rows[0].hash !== hash)
      throw new Error(
        "An applied migration changed. Restore it and append a new migration.",
      );
    continue;
  }
  const statements = source
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql.query(
      "INSERT INTO app_migrations (name,hash,applied_at) VALUES ($1,$2,$3)",
      [file, hash, new Date().toISOString()],
    ),
  ]);
  console.log("Applied migration:", file);
}
console.log("Postgres schema is ready. No credentials were printed.");
