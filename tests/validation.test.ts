import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, isKind, workspaceSchema } from "../lib/models.ts";
import { sampleData } from "../lib/sample.ts";
import { verifySignature } from "../lib/webhook.ts";
import { passwordSchema } from "../lib/auth-validation.ts";
import { postgresSQL } from "../lib/sql.ts";
test("all sample fixtures obey the production schemas", () => {
  for (const item of sampleData)
    assert.doesNotThrow(() => validate(item.kind, item.data));
});
test("invalid collection names cannot access arbitrary data", () => {
  assert.equal(isKind("__proto__"), false);
  assert.equal(isKind("workspaces"), false);
  assert.equal(isKind("orders"), true);
});
test("orders reject negative totals, fractional quantities and missing customer names", () => {
  const order = {
    name: "Customer",
    product: "Shirt",
    quantity: 1,
    amount: 100,
    status: "Pending",
    channel: "Website",
  };
  for (const change of [
    { amount: -1 },
    { quantity: 1.5 },
    { name: "   " },
    { status: "Paid" },
    { channel: "Unknown" },
  ])
    assert.throws(() => validate("orders", { ...order, ...change }));
  assert.equal(validate("orders", order).address, "");
});
test("server validation strips unknown privilege and ownership fields", () => {
  const p = validate("products", {
    name: "Test",
    sku: "TEST",
    price: 100,
    stock: 10,
    category: "Other",
    status: "Active",
    workspace_id: "another-user",
    role: "Owner",
  });
  assert.equal(p.workspace_id, undefined);
  assert.equal(p.role, undefined);
});
test("team roster entries require a valid email", () => {
  assert.throws(() =>
    validate("team", {
      name: "Agent",
      email: "not-email",
      role: "Admin",
      status: "Roster only",
    }),
  );
});
test("workspace settings restrict currency and boolean types", () => {
  assert.throws(() =>
    workspaceSchema.parse({
      name: "Shop",
      ownerName: "Owner",
      currency: "XXX",
      language: "English",
      agentEnabled: "true",
      darkMode: false,
    }),
  );
});
test("webhook signatures validate raw bytes and reject body tampering", async () => {
  const raw = '{"message":"hello"}';
  const secret = "test-only-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature =
    "sha256=" +
    Buffer.from(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
    ).toString("hex");
  assert.equal(await verifySignature(raw, signature, secret), true);
  assert.equal(await verifySignature(raw + " ", signature, secret), false);
  assert.equal(await verifySignature(raw, null, secret), false);
  assert.equal(await verifySignature(raw, "sha256=invalid", secret), false);
});

test("password validation prevents bcrypt UTF-8 truncation", () => {
  assert.doesNotThrow(() =>
    passwordSchema.parse("A long unique password 2026!"),
  );
  assert.throws(() => passwordSchema.parse("short"));
  assert.throws(() => passwordSchema.parse("🌿".repeat(20)));
});
test("PostgreSQL adapter preserves parameters, JSON lookup and camel-case aliases", () => {
  assert.equal(
    postgresSQL(
      "SELECT json_extract(payload,'$.conversationId') AS conversationId FROM records WHERE workspace_id=? AND id=?",
    ),
    "SELECT (payload::jsonb ->> 'conversationId') AS \"conversationId\" FROM records WHERE workspace_id=$1 AND id=$2",
  );
  assert.match(
    postgresSQL("INSERT OR IGNORE INTO workspaces (id,owner_id) VALUES (?,?)"),
    /ON CONFLICT \(owner_id\) DO NOTHING$/,
  );
});
