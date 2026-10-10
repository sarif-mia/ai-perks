const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..");
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const suffix = Date.now().toString(36);
function sql(command) {
  execFileSync(
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
      command,
    ],
    { cwd: root, stdio: "pipe" },
  );
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const anon = await browser.newContext();
  assert.equal((await anon.request.get(base + "/api/workspace")).status(), 401);
  assert.equal(
    (
      await anon.request.get(base + "/api/workspace", {
        headers: {
          "oai-authenticated-user-id": "forged",
          "oai-authenticated-user-email": "forged@example.com",
        },
      })
    ).status(),
    401,
  );
  await anon.close();
  await page.goto(base + "/signup");
  await page.locator('[name="name"]').fill("QA Owner " + suffix);
  await page.locator('[name="email"]').fill("qa-" + suffix + "@example.com");
  await page.locator('[name="password"]').fill("QA-Strong-Password-2026!");
  await page.locator('button[type="submit"]').click();
  await page.locator("main h1").waitFor({ timeout: 90000 });
  const req = context.request;
  const headers = { Origin: base };
  const request = async (url, method = "GET", data) => {
    const res = await req.fetch(base + url, {
      method,
      data,
      headers: method === "GET" ? {} : headers,
    });
    const body = await res.json();
    assert(res.ok(), JSON.stringify(body));
    return body;
  };
  let snapshot = await request("/api/workspace");
  if (snapshot.records.length === 0) {
    await request("/api/sample", "POST", {});
    await page.reload();
    await page.locator("main h1").waitFor();
  }
  const nav = await page
    .locator(".sidebar-nav a")
    .evaluateAll((links) =>
      links.map((a) => ({ path: a.getAttribute("href"), label: a.innerText })),
    );
  assert.equal(nav.length, 23);
  for (const item of nav) {
    await page.locator(`.sidebar-nav a[href="${item.path}"]`).click();
    await page.locator("main h1").waitFor();
    assert(await page.locator("main h1").innerText());
  }
  const product = {
    name: "QA Product " + suffix,
    sku: "QA-" + suffix,
    price: 500,
    stock: 5,
    category: "Other",
    description: "End-to-end verification",
    status: "Active",
  };
  const created = await request("/api/records/products", "POST", product);
  snapshot = await request("/api/workspace");
  const record = snapshot.records.find((r) => r.id === created.id);
  assert(record);
  const invalid = await req.post(base + "/api/records/products", {
    headers,
    data: { ...product, price: -1 },
  });
  assert.equal(invalid.status(), 422);
  const cross = await req.post(base + "/api/records/products", {
    headers: { Origin: "https://untrusted.example" },
    data: product,
  });
  assert.equal(cross.status(), 403);
  await request("/api/records/products/" + record.id, "PATCH", {
    data: { ...product, stock: 4 },
    version: record.version,
  });
  const stale = await req.patch(base + "/api/records/products/" + record.id, {
    headers,
    data: { data: product, version: record.version },
  });
  assert.equal(stale.status(), 409);
  const foreignWorkspace = "qa-foreign-" + suffix;
  const foreignRecord = "qa-hidden-" + suffix;
  sql(
    `INSERT INTO workspaces (id,owner_id,name,owner_name,created_at) VALUES ('${foreignWorkspace}','${foreignWorkspace}','Other business','Other owner','2026-10-10T00:00:00Z'); INSERT INTO records (id,workspace_id,kind,title,payload,created_at,updated_at) VALUES ('${foreignRecord}','${foreignWorkspace}','products','Private foreign product','{}','2026-10-10T00:00:00Z','2026-10-10T00:00:00Z');`,
  );
  assert.equal((await req.get(base + "/api/records/products")).status(), 200);
  assert(
    !(await request("/api/records/products")).some(
      (r) => r.id === foreignRecord,
    ),
  );
  const foreign = await req.patch(
    base + "/api/records/products/" + foreignRecord,
    { headers, data: { data: product, version: 1 } },
  );
  assert.equal(foreign.status(), 404);
  sql(
    `DELETE FROM records WHERE workspace_id='${foreignWorkspace}'; DELETE FROM workspaces WHERE id='${foreignWorkspace}';`,
  );
  await page.goto(base + "/dashboard/products");
  await page.locator("main h1").waitFor();
  await page.locator('input[aria-label="Search records"]').fill(product.name);
  assert.match(await page.locator(".entity-card").innerText(), /QA Product/);
  await page.reload();
  await page.locator("main h1").waitFor();
  assert.match(
    await page.locator("main").innerText(),
    new RegExp(product.name),
  );
  await page.locator(".head-buttons button").click();
  await page
    .locator("dialog input")
    .first()
    .fill("UI Product " + suffix);
  await page
    .locator("dialog input")
    .nth(1)
    .fill("UI-" + suffix);
  await page.locator('dialog input[type="number"]').first().fill("100");
  await page.locator('dialog input[type="number"]').nth(1).fill("2");
  await page.locator('dialog button[type="submit"]').click();
  await page.locator("dialog").waitFor({ state: "detached" });
  const order = await request("/api/records/orders", "POST", {
    name: "QA Order " + suffix,
    product: product.name,
    quantity: 1,
    amount: 500,
    status: "Pending",
    channel: "Website",
    phone: "",
    address: "",
  });
  snapshot = await request("/api/workspace");
  const orderRecord = snapshot.records.find((r) => r.id === order.id);
  assert.equal(
    (
      await req.delete(base + "/api/records/orders/" + order.id, {
        headers,
        data: { version: orderRecord.version },
      })
    ).status(),
    405,
  );
  await request("/api/records/orders/" + order.id, "PATCH", {
    data: { ...orderRecord.data, status: "Cancelled" },
    version: orderRecord.version,
  });
  await page.goto(base + "/dashboard/orders");
  await page.locator("main h1").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('a[href="/api/export?kind=orders"]').click();
  assert.equal(
    (await downloadPromise).suggestedFilename(),
    "ai-perks-orders.csv",
  );
  const conv = await request("/api/records/conversations", "POST", {
    name: "QA Chat " + suffix,
    channel: "Website",
    status: "Waiting",
    customerId: "",
    summary: "Test conversation",
  });
  await page.goto(base + "/dashboard/inbox");
  await page.locator("main h1").waitFor();
  await page
    .locator('[aria-label="Find a conversation"]')
    .fill("QA Chat " + suffix);
  await page.locator(".conversation").click();
  await page.getByRole("button", { name: "Take over", exact: true }).click();
  await page
    .getByRole("button", { name: "Return to AI", exact: true })
    .waitFor();
  await page.locator('[aria-label="Your reply"]').fill("Hello <safe>");
  await page.locator('[aria-label="Send reply"]').click();
  await page.getByText("Hello <safe>", { exact: true }).waitFor();
  await page.locator(".search-trigger").click();
  await page.locator("dialog input").fill(product.name);
  await page.locator(".search-result").click();
  assert.match(page.url(), /products/);
  await page.locator('[aria-label="Close dialog"]').click();
  await page.goto(base + "/dashboard/settings");
  await page.locator("main h1").waitFor();
  await page.locator('[aria-label="Dark appearance"]').click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.locator('[aria-label="Dark appearance"]').click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  assert.equal(
    (
      await req.post(base + "/api/assistant", {
        headers,
        data: { prompt: "What is the return policy?" },
      })
    ).status(),
    503,
  );
  assert.equal(
    (await req.post(base + "/api/webhooks/meta", { data: {} })).status(),
    503,
  );
  fs.mkdirSync(path.join(root, "test-results"), { recursive: true });
  await page.goto(base + "/dashboard");
  await page.locator("main h1").waitFor();
  await page.screenshot({
    path: path.join(root, "test-results/desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const item of nav) {
    await page.locator('[aria-label="Open navigation"]').click();
    await page.locator(`.sidebar-nav a[href="${item.path}"]`).click();
    await page.locator("main h1").waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow: ${item.path}`,
    );
    assert(
      !(await page
        .locator(".sidebar")
        .evaluate((el) => el.classList.contains("open"))),
    );
  }
  await page.goto(base + "/dashboard");
  await page.locator("main h1").waitFor();
  await page.screenshot({
    path: path.join(root, "test-results/mobile.png"),
    fullPage: true,
  });
  const second = await browser.newContext();
  await second.request.post(base + "/api/auth/login", {
    headers: { Origin: base },
    data: {
      email: "qa-" + suffix + "@example.com",
      password: "QA-Strong-Password-2026!",
    },
  });
  const secondSnapshot = await (
    await second.request.get(base + "/api/workspace")
  ).json();
  assert(
    secondSnapshot.records.some(
      (r) => r.id === record.id && r.data.stock === 4,
    ),
  );
  await second.close();
  assert.deepEqual(errors, []);
  snapshot = await request("/api/workspace");
  for (const r of snapshot.records.filter(
    (r) =>
      (r.title.includes(suffix) ||
        (r.kind === "messages" && r.data.conversationId === conv.id)) &&
      r.kind !== "orders" &&
      r.kind !== "messages",
  ))
    await request(`/api/records/${r.kind}/${r.id}`, "DELETE", {
      version: r.version,
    });
  console.log(
    "PASS: 23 desktop/mobile views; authentication and forged-header rejection; tenant isolation; CRUD, validation, CSRF, version conflicts; durable data across sessions; order retention; CSV; inbox takeover/replies; search; dark mode; clear unavailable-provider responses.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
