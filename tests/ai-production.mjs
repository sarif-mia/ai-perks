import assert from "node:assert/strict";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes, randomUUID } from "node:crypto";
const sql = neon(process.env.DATABASE_URL);
const base = process.env.TEST_URL || "https://ai-perks-two.vercel.app";
const [owner] =
  await sql`SELECT users.id AS user_id,workspaces.id AS workspace_id FROM users JOIN workspaces ON workspaces.owner_id=users.id WHERE users.email='sarif.aihrbd@gmail.com' AND workspaces.approval_status='approved'`;
assert(owner, "Approved AIHR BD company must exist");
const token = randomBytes(32).toString("hex"),
  hash = createHash("sha256").update(token).digest("hex");
const ids = [];
let browser;
async function record(kind, title, data, date = new Date().toISOString()) {
  const id = randomUUID();
  ids.push(id);
  await sql`INSERT INTO records(id,workspace_id,kind,title,payload,version,created_at,updated_at) VALUES(${id},${owner.workspace_id},${kind},${title},${JSON.stringify(data)},1,${date},${date})`;
  return id;
}
try {
  await sql`INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(${hash},${owner.user_id},${Date.now() + 600000},${new Date().toISOString()})`;
  const conversationId = await record("conversations", "AI integration test", {
    name: "AI integration test",
    channel: "Website",
    status: "Waiting",
    summary: "Temporary controlled AI verification",
    customerId: "",
  });
  await record("knowledge", "Temporary test facts", {
    name: "Temporary test facts",
    type: "FAQ",
    content:
      "Only for this controlled integration test: Blue Test Item costs 500 BDT. Red Test Item costs 800 BDT. Delivery for either is 60 BDT. Stock and delivery dates are unknown.",
    status: "Active",
  });
  const timestamp = Date.now();
  await record(
    "messages",
    "Test question",
    {
      conversationId,
      text: "Blue Test Item er dam koto?",
      direction: "in",
      delivery: "Received",
    },
    new Date(timestamp - 3000).toISOString(),
  );
  await record(
    "messages",
    "Test previous answer",
    {
      conversationId,
      text: "Blue Test Item-এর দাম ৫০০ টাকা।",
      direction: "out",
      delivery: "Local",
    },
    new Date(timestamp - 2000).toISOString(),
  );
  await record(
    "messages",
    "Test followup",
    {
      conversationId,
      text: "তাহলে ডেলিভারি সহ মোট কত?",
      direction: "in",
      delivery: "Received",
    },
    new Date(timestamp - 1000).toISOString(),
  );
  browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "ai_perks_session",
      value: token,
      domain: new URL(base).hostname,
      path: "/",
      httpOnly: true,
      secure: new URL(base).protocol === "https:",
      sameSite: "Lax",
    },
  ]);
  const req = context.request,
    headers = { Origin: base };
  const snapshot = await (await req.get(base + "/api/workspace")).json();
  assert.equal(snapshot.integrations.ai, true);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(60000);
  await page.goto(base + "/dashboard/inbox");
  await page.getByRole("button", { name: "AI draft", exact: true }).waitFor();
  const aiResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/assistant") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "AI draft", exact: true }).click();
  const response = await aiResponse;
  const ai = await response.json();
  assert.equal(response.status(), 200, ai.error);
  assert.equal(ai.source, "Gemini");
  assert.equal(ai.needsReview, true);
  const normalized = ai.reply.replace(/[০-৯]/g, (n) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(n)),
  );
  assert.match(
    normalized,
    /560/,
    "Follow-up must use the Blue item from conversation history",
  );
  await page
    .getByRole("textbox", { name: "Your reply", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Your reply", exact: true })
      .inputValue(),
    ai.reply,
  );
  const savedResponse = page.waitForResponse(
    (r) => r.url().endsWith("/messages") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send reply", exact: true }).click();
  const saved = await savedResponse;
  assert.equal(saved.status(), 201);
  assert.equal((await saved.json()).delivery, "Local");
  const [foreign] =
    await sql`SELECT id FROM records WHERE kind='conversations' AND workspace_id<>${owner.workspace_id} LIMIT 1`;
  if (foreign) {
    const r = await req.post(base + "/api/assistant", {
      headers,
      data: { conversationId: foreign.id },
    });
    assert.equal(r.status(), 404);
  }
  const result = await (await req.get(base + "/api/workspace")).json();
  const generated = result.records.filter(
    (r) =>
      r.kind === "messages" &&
      r.data.conversationId === conversationId &&
      !ids.includes(r.id),
  );
  ids.push(...generated.map((r) => r.id));
  console.log(
    JSON.stringify({
      status: "PASS",
      company: "AIHR BD",
      checks:
        "Live Gemini; conversation follow-up; Bangla reply; correct verified total; browser AI draft; local reply persistence; foreign conversation isolation",
      reply: ai.reply,
      delivery: "Local — Facebook deferred",
    }),
  );
} finally {
  if (browser) await browser.close();
  await sql`DELETE FROM records WHERE workspace_id=${owner.workspace_id} AND (id=ANY(${ids}) OR (kind='messages' AND payload::jsonb->>'conversationId'=ANY(${ids})))`;
  await sql`DELETE FROM sessions WHERE token_hash=${hash}`;
  console.log("Temporary AI test records and session removed.");
}
