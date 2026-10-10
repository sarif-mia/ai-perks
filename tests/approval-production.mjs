import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const base = process.env.TEST_URL || "https://ai-perks-two.vercel.app";
const email = `approval-${crypto.randomUUID()}@example.com`,
  password = crypto.randomUUID() + "Aa!";
async function post(path, data, cookie = "") {
  return fetch(base + path, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json", cookie },
    body: JSON.stringify(data),
  });
}
let id;
try {
  let r = await post("/api/auth/signup", {
    name: "Approval Test",
    companyName: "Temporary approval verification",
    email,
    password,
    role: "superadmin",
  });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get("set-cookie"), null);
  assert.equal((await r.json()).status, "pending");
  const [user] = await sql`SELECT id,role FROM users WHERE email=${email}`;
  id = user.id;
  assert.equal(user.role, "member");
  r = await post("/api/auth/login", { email, password });
  assert.equal(r.status, 403);
  await sql`UPDATE workspaces SET approval_status='approved' WHERE owner_id=${id}`;
  r = await post("/api/auth/login", { email, password });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  r = await fetch(base + "/api/admin", { headers: { cookie } });
  assert.equal(r.status, 403);
  r = await fetch(base + "/api/workspace", { headers: { cookie } });
  assert.equal(r.status, 200);
  await sql`UPDATE workspaces SET suspended=1 WHERE owner_id=${id}`;
  r = await fetch(base + "/api/workspace", { headers: { cookie } });
  assert.equal(r.status, 401);
  r = await post("/api/auth/login", { email, password });
  assert.equal(r.status, 403);
  await sql`UPDATE workspaces SET suspended=0,approval_status='rejected' WHERE owner_id=${id}`;
  r = await post("/api/auth/login", { email, password });
  assert.equal(r.status, 403);
  console.log(
    "PASS: pending approval, role spoof rejection, approved login, admin denial, existing-session suspension, rejected login.",
  );
} finally {
  if (!id) {
    const rows = await sql`SELECT id FROM users WHERE email=${email}`;
    id = rows[0]?.id;
  }
  if (id) {
    await sql.transaction([
      sql`DELETE FROM workspaces WHERE owner_id=${id}`,
      sql`DELETE FROM users WHERE id=${id}`,
    ]);
    console.log("Temporary company/account removed.");
  }
}
