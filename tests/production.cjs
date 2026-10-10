const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
let secretPassword = "";
async function hiddenInput() {
  process.stdout.write(
    "Ready for production test JSON on stdin (input is hidden).\n",
  );
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const read = (chunk) => {
      value += chunk.toString();
      if (value.includes("\n")) {
        process.stdin.off("data", read);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(JSON.parse(value.slice(0, value.indexOf("\n"))));
      }
    };
    process.stdin.on("data", read);
  });
}
(async () => {
  const { url, email, password } = await hiddenInput();
  secretPassword = password;
  const browser = await chromium.launch({
    executablePath:
      process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.env.CHROME_PATH,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/auth/login"))
      console.log(
        JSON.stringify({
          loginStatus: response.status(),
          result: await response.json().catch(() => null),
        }),
      );
  });
  const anonymous = await browser.newContext();
  assert.equal((await anonymous.request.get(url + "/login")).status(), 200);
  assert.equal(
    (await anonymous.request.get(url + "/api/workspace")).status(),
    401,
  );
  await anonymous.close();
  await page.goto(url + "/login");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL("**/admin", { timeout: 20000 });
  } catch (e) {
    console.log(
      JSON.stringify({
        path: new URL(page.url()).pathname,
        formError: await page
          .locator('[role="alert"]')
          .textContent()
          .catch(() => null),
      }),
    );
    throw e;
  }
  await page.getByRole("button", { name: "Open workspace" }).first().waitFor();
  const row = page
    .locator("tbody tr")
    .filter({ hasText: "AI Perks Demo Company" });
  assert.equal(await row.count(), 1);
  await row.getByRole("button", { name: "Open workspace" }).click();
  await page.waitForURL("**/dashboard");
  await page.locator("main h1").waitFor();
  const req = context.request;
  const snapshot = await (await req.get(url + "/api/workspace")).json();
  assert.equal(snapshot.workspace.name, "AI Perks Demo Company");
  assert(snapshot.records.length >= 20);
  assert.equal(snapshot.user.role, "superadmin");
  const nav = await page
    .locator(".sidebar-nav a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  assert.equal(nav.length, 23);
  for (const path of nav) {
    await page.locator(`.sidebar-nav a[href="${path}"]`).click();
    await page.locator("main h1").waitFor();
  }
  const marker = "Production check " + Date.now();
  const headers = { Origin: url };
  const create = await req.post(url + "/api/records/products", {
    headers,
    data: {
      name: marker,
      sku: "VERIFY-" + Date.now(),
      price: 100,
      stock: 1,
      category: "Other",
      description: "Temporary deployment verification",
      status: "Draft",
    },
  });
  assert.equal(create.status(), 201);
  const { id } = await create.json();
  const snapshot2 = await (await req.get(url + "/api/workspace")).json();
  const record = snapshot2.records.find((r) => r.id === id);
  assert(record);
  const deletion = await req.delete(url + "/api/records/products/" + id, {
    headers,
    data: { version: record.version },
  });
  assert.equal(deletion.status(), 200);
  const suffix = Date.now().toString(36);
  const ownerEmail = "verify-" + suffix + "@example.com";
  const ownerPassword = "Verification-Only-2026!";
  const owner = await browser.newContext();
  const signup = await owner.request.post(url + "/api/auth/signup", {
    headers,
    data: {
      name: "Temporary verifier",
      email: ownerEmail,
      password: ownerPassword,
      role: "superadmin",
    },
  });
  assert.equal(signup.status(), 201);
  assert.equal((await owner.request.get(url + "/api/admin")).status(), 403);
  const owned = await (await owner.request.get(url + "/api/workspace")).json();
  assert.notEqual(owned.workspace.id, snapshot.workspace.id);
  assert.equal(owned.records.length, 0);
  const isolated = await owner.request.patch(
    url +
      "/api/records/products/" +
      snapshot.records.find((r) => r.kind === "products").id,
    {
      headers,
      data: {
        data: snapshot.records.find((r) => r.kind === "products").data,
        version: 1,
      },
    },
  );
  assert.equal(isolated.status(), 404);
  const forgedSwitch = await owner.request.post(url + "/api/admin/switch", {
    headers,
    data: { id: snapshot.workspace.id },
  });
  assert.equal(forgedSwitch.status(), 403);
  await owner.request.post(url + "/api/auth/logout", { headers, data: {} });
  assert.equal((await owner.request.get(url + "/api/workspace")).status(), 401);
  await owner.close();
  fs.mkdirSync("test-results", { recursive: true });
  await page.goto(url + "/dashboard");
  await page.locator("main h1").waitFor();
  await page.screenshot({
    path: "test-results/production-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of nav) {
    await page.locator('[aria-label="Open navigation"]').click();
    await page.locator(`.sidebar-nav a[href="${path}"]`).click();
    await page.locator("main h1").waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile overflow: " + path,
    );
  }
  await page.goto(url + "/dashboard");
  await page.locator("main h1").waitFor();
  await page.screenshot({
    path: "test-results/production-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    JSON.stringify({
      status: "PASS",
      checks:
        "Public login; super-admin; demo company; 23 desktop/mobile views; PostgreSQL CRUD; owner isolation; privilege escalation rejection; logout revocation",
      temporaryUserEmail: ownerEmail,
    }),
  );
})().catch((e) => {
  console.error(
    String(e.message).replaceAll(
      secretPassword || "__no_password__",
      "[redacted]",
    ),
  );
  process.exit(1);
});
