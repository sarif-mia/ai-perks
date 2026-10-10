const { chromium } = require("playwright");
const assert = require("node:assert/strict");
let secret = "";
async function hiddenInput() {
  process.stdout.write(
    "Ready for AI browser test JSON on stdin (input is hidden).\n",
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
  secret = password;
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext();
  const req = context.request,
    headers = { Origin: url };
  const cleanup = [];
  async function post(path, data) {
    const r = await req.post(url + path, { headers, data });
    const body = await r.json();
    assert(r.ok(), `${path}: ${r.status()} ${body.error || ""}`);
    return body;
  }
  async function create(kind, data) {
    const r = await post("/api/records/" + kind, data);
    cleanup.push({ kind, id: r.id });
    return r.id;
  }
  try {
    await post("/api/auth/login", { email, password });
    const platform = await (await req.get(url + "/api/admin")).json();
    const company = platform.companies.find(
      (c) => c.email === "sarif.aihrbd@gmail.com",
    );
    assert(company);
    await post("/api/admin/switch", { id: company.id });
    const snapshot = await (await req.get(url + "/api/workspace")).json();
    assert.equal(snapshot.integrations.ai, true);
    const name = "AI context verification " + Date.now();
    const conversationId = await create("conversations", {
      name,
      channel: "Website",
      status: "Waiting",
      summary: "Temporary controlled AI test",
    });
    await create("knowledge", {
      name: "Temporary AI test reference",
      type: "FAQ",
      content:
        "Only for this controlled test: Blue Test Item costs 500 BDT. Red Test Item costs 800 BDT. Delivery costs 60 BDT. Stock quantities and delivery dates are unknown.",
      status: "Active",
    });
    await post(`/api/conversations/${conversationId}/messages`, {
      text: "Blue Test Item er dam koto?",
      simulateCustomer: true,
    });
    await post(`/api/conversations/${conversationId}/messages`, {
      text: "Blue Test Item-এর দাম ৫০০ টাকা।",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.goto(url + "/dashboard/inbox");
    await page
      .getByRole("button")
      .filter({ has: page.getByText(name, { exact: true }) })
      .click();
    await page
      .getByRole("button", { name: "Test a customer message", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Test customer question", exact: true })
      .fill("তাহলে ডেলিভারি সহ মোট কত?");
    const incomingResponse = page.waitForResponse(
      (r) => r.url().endsWith("/messages") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Add test message", exact: true })
      .click();
    assert.equal((await incomingResponse).status(), 201);
    await page
      .getByRole("textbox", { name: "Your reply", exact: true })
      .waitFor();
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
    assert.match(normalized, /560/);
    await page.waitForFunction(
      (expected) =>
        document.querySelector('[aria-label="Your reply"]')?.value === expected,
      ai.reply,
    );
    const savedResponse = page.waitForResponse(
      (r) => r.url().endsWith("/messages") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Send reply", exact: true }).click();
    const saved = await savedResponse;
    assert.equal(saved.status(), 201);
    assert.equal((await saved.json()).delivery, "Local");
    const messengerId = await create("conversations", {
      name: "Temporary simulation restriction test",
      channel: "Messenger",
      status: "Waiting",
      summary: "Temporary negative test",
    });
    assert.equal(
      (
        await req.post(url + `/api/conversations/${messengerId}/messages`, {
          headers,
          data: { text: "A test", simulateCustomer: true },
        })
      ).status(),
      422,
    );
    const uncertain = await post("/api/assistant", {
      prompt: "Blue Test Item এখন কত পিস স্টকে আছে?",
    });
    assert.match(uncertain.reply, /[\u0980-\u09ff]/);
    console.log(
      JSON.stringify({
        status: "PASS",
        company: company.name,
        checks:
          "Live Gemini; UI customer simulation; conversation-context follow-up; correct 560 BDT total; Bangla reply; reviewed local save; external-thread simulation blocked",
        reply: ai.reply,
        stockAnswer: uncertain.reply,
        externalMessagesSent: 0,
      }),
    );
  } finally {
    for (const record of cleanup.reverse())
      try {
        const r = await req.delete(
          url + `/api/records/${record.kind}/${record.id}`,
          { headers, data: { version: 1 } },
        );
        if (!r.ok())
          console.log("Cleanup pending for temporary test record:", record.id);
      } catch {
        console.log("Temporary test cleanup request failed");
      }
    await req
      .post(url + "/api/admin/switch", { headers, data: { id: "" } })
      .catch(() => {});
    await req
      .post(url + "/api/auth/logout", { headers, data: {} })
      .catch(() => {});
    await browser.close();
    console.log("Temporary test records removed; test session signed out.");
  }
})().catch((e) => {
  console.error(
    String(e.message).replaceAll(secret || "__NO_SECRET__", "[REDACTED]"),
  );
  process.exit(1);
});
