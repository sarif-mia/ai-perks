import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { sampleData } from "../lib/sample.ts";
import { randomUUID, randomBytes } from "node:crypto";
async function input() {
  process.stdout.write(
    "Ready for administrator JSON on stdin (input is hidden).\n",
  );
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    return await new Promise((resolve) => {
      let value = "";
      const read = (chunk) => {
        value += chunk.toString();
        if (value.includes("\n")) {
          process.stdin.off("data", read);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(value.slice(0, value.indexOf("\n")));
        }
      };
      process.stdin.on("data", read);
    });
  }
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}
const {
  email,
  password,
  name = "Sarif Mia",
  companyName = "AI Perks Demo Company",
} = JSON.parse(await input());
if (
  typeof email !== "string" ||
  !email.includes("@") ||
  typeof password !== "string" ||
  password.length < 12 ||
  Buffer.byteLength(password) > 72
)
  throw new Error(
    "Provide a valid email and password with at least 12 characters and at most 72 UTF-8 bytes.",
  );
const postgres = process.argv.includes("--postgres");
const sqlClient = postgres
  ? neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "")
  : null;
function literal(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function local(sql) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      "--command",
      sql,
      "--json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status)
    throw new Error(
      "Local database command failed. Apply migrations before bootstrapping.",
    );
  const payload = JSON.parse(result.stdout);
  return payload.flatMap((r) => r.results || []);
}
async function query(sql, params = []) {
  if (sqlClient)
    return sqlClient.query(
      sql.replace(
        /\?/g,
        (() => {
          let i = 0;
          return () => "$" + ++i;
        })(),
      ),
      params,
    );
  let i = 0;
  return local(sql.replace(/\?/g, () => literal(params[i++])));
}
const normalized = email.trim().toLowerCase();
const demoEmail = "demo-company@aiperks.example";
const now = new Date().toISOString();
const existing = (
  await query("SELECT id FROM users WHERE email=?", [normalized])
)[0];
const adminId = existing?.id || randomUUID();
const hash = await bcrypt.hash(password, 12);
if (existing)
  await query(
    "UPDATE users SET name=?,password_hash=?,role='superadmin' WHERE id=?",
    [name, hash, adminId],
  );
else
  await query(
    "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
    [adminId, normalized, name, hash, "superadmin", now],
  );
await query("DELETE FROM sessions WHERE user_id=?", [adminId]);
const adminWorkspace = (
  await query("SELECT id FROM workspaces WHERE owner_id=?", [adminId])
)[0];
if (!adminWorkspace)
  await query(
    "INSERT INTO workspaces (id,owner_id,name,owner_name,created_at) VALUES (?,?,?,?,?)",
    [randomUUID(), adminId, "AI Perks Administration", name, now],
  );
let demoUser = (
  await query("SELECT id FROM users WHERE email=?", [demoEmail])
)[0];
if (!demoUser) {
  demoUser = { id: randomUUID() };
  await query(
    "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
    [
      demoUser.id,
      demoEmail,
      "Demo Manager",
      await bcrypt.hash(randomBytes(32).toString("hex"), 12),
      "member",
      now,
    ],
  );
}
let demoWorkspace = (
  await query("SELECT id FROM workspaces WHERE owner_id=?", [demoUser.id])
)[0];
if (!demoWorkspace) {
  demoWorkspace = { id: randomUUID() };
  await query(
    "INSERT INTO workspaces (id,owner_id,name,owner_name,sample_imported,created_at) VALUES (?,?,?,?,1,?)",
    [demoWorkspace.id, demoUser.id, companyName, "Demo Manager", now],
  );
}
const count = (
  await query("SELECT COUNT(*) AS n FROM records WHERE workspace_id=?", [
    demoWorkspace.id,
  ])
)[0];
if (Number(count.n) === 0) {
  const ids = new Map();
  for (const s of sampleData) if (s.id) ids.set(s.id, randomUUID());
  const entries = sampleData.map((s) => {
    const data = { ...s.data };
    if (s.kind === "messages")
      data.conversationId = ids.get(data.conversationId);
    return {
      query:
        "INSERT INTO records (id,workspace_id,kind,title,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      params: [
        s.id ? ids.get(s.id) : randomUUID(),
        demoWorkspace.id,
        s.kind,
        String(data.name || data.text || s.kind).slice(0, 200),
        JSON.stringify(data),
        now,
        now,
      ],
    };
  });
  if (sqlClient)
    await sqlClient.transaction(
      entries.map((e) =>
        sqlClient.query(
          e.query.replace(
            /\?/g,
            (() => {
              let i = 0;
              return () => "$" + ++i;
            })(),
          ),
          e.params,
        ),
      ),
    );
  else {
    const joined = entries
      .map((e) => {
        let i = 0;
        return e.query.replace(/\?/g, () => literal(e.params[i++])) + ";";
      })
      .join("\n");
    local(joined);
  }
}
console.log(
  "Super-admin account and demo company are ready. Password was hashed and was not written to source or files.",
);
