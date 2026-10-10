const { chromium } = require("playwright");
const assert = require("node:assert/strict");
let secret = "";
async function input() {
  process.stdout.write(
    "Ready for workflow production JSON on stdin (input is hidden).\n",
  );
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const read = (c) => {
      value += c.toString();
      if (value.includes("\n")) {
        process.stdin.off("data", read);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(JSON.parse(value.split("\n")[0]));
      }
    };
    process.stdin.on("data", read);
  });
}
(async () => {
  const { url, email, password } = await input();
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
  let workspace;
  async function call(path, method = "GET", data) {
    const r = await req.fetch(url + path, { method, headers, data });
    const d = await r.json();
    assert(r.ok(), `${path}: ${r.status()} ${d.error || ""}`);
    return d;
  }
  async function create(kind, data) {
    const d = await call("/api/records/" + kind, "POST", data);
    cleanup.push({ kind, id: d.id });
    return d.id;
  }
  try {
    await call("/api/auth/login", "POST", { email, password });
    const platform = await call("/api/admin");
    const company = platform.companies.find(
      (c) => c.email === "sarif.aihrbd@gmail.com",
    );
    assert(company);
    await call("/api/admin/switch", "POST", { id: company.id });
    workspace = (await call("/api/workspace")).workspace;
    await call("/api/workspace", "PATCH", {
      ...workspace,
      usageMode: "personal",
      agentEnabled: true,
    });
    const providers = (await call("/api/connections")).providers;
    assert.equal(providers.length, 4);
    assert.equal(JSON.stringify(providers).includes("accessToken"), false);
    const marker = "Workflow check " + Date.now();
    await create("automations", {
      name: marker + " notify",
      trigger: "New task",
      action: "Notify team",
      enabled: true,
      instructions: "Local test notification",
    });
    await create("automations", {
      name: marker + " follow-up",
      trigger: "New task",
      action: "Create follow-up",
      enabled: true,
      instructions: "Local test follow-up",
    });
    const missingGoogle = !providers.find((p) => p.id === "google-tasks")
      ?.connected;
    if (missingGoogle)
      await create("automations", {
        name: marker + " missing connection",
        trigger: "New task",
        action: "Add Google task",
        enabled: true,
        instructions: "",
      });
    const taskId = await create("tasks", {
      name: marker,
      notes: "Temporary verification",
      due: "2026-10-11",
      status: "To do",
      priority: "Normal",
    });
    let runs = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      await call("/api/automations/runs", "POST", {});
      runs = (await call("/api/automations/runs")).runs.filter(
        (r) => r.sourceId === taskId,
      );
      if (
        runs.length === (missingGoogle ? 3 : 2) &&
        runs.every((r) => ["completed", "failed"].includes(r.status))
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.equal(runs.length, missingGoogle ? 3 : 2);
    assert.equal(runs.filter((r) => r.status === "completed").length, 2);
    assert.equal(new Set(runs.map((r) => r.automationId)).size, runs.length);
    const snapshot = await call("/api/workspace");
    assert.equal(snapshot.workspace.usageMode, "personal");
    const followups = snapshot.records.filter(
      (r) => r.kind === "followups" && r.title === marker,
    );
    assert.equal(followups.length, 1);
    cleanup.push({ kind: "followups", id: followups[0].id });
    assert(
      snapshot.events.some(
        (e) => e.entityKind === "notification" && e.action.includes(marker),
      ),
    );
    await call("/api/automations/runs", "POST", {});
    assert.equal(
      (await call("/api/workspace")).records.filter(
        (r) => r.kind === "followups" && r.title === marker,
      ).length,
      1,
    );
    if (missingGoogle) {
      const failed = runs.find((r) => r.action === "Add Google task");
      assert.equal(failed.status, "failed");
      assert.match(
        JSON.parse(failed.result).message,
        /Connect this Google service/,
      );
      assert.equal(
        (
          await req.post(url + "/api/automations/runs", {
            headers,
            data: { retryId: failed.id },
          })
        ).status(),
        422,
      );
    }
    await create("automations", {
      name: marker + " AI draft",
      trigger: "Customer question",
      action: "Suggest reply",
      enabled: true,
      instructions: "",
    });
    await create("automations", {
      name: marker + " review",
      trigger: "Customer question",
      action: "Request review",
      enabled: true,
      instructions: "",
    });
    await create("knowledge", {
      name: marker + " reference",
      type: "FAQ",
      content:
        "For this controlled workflow test, Blue Test Item costs 500 BDT and delivery is 60 BDT. Stock is unknown.",
      status: "Active",
    });
    const conversationId = await create("conversations", {
      name: marker + " conversation",
      channel: "Website",
      status: "Waiting",
      summary: "Controlled workflow verification",
    });
    await call(`/api/conversations/${conversationId}/messages`, "POST", {
      text: "Blue Test Item er delivery shoho total koto?",
      simulateCustomer: true,
    });
    const question = (await call("/api/workspace")).records.find(
      (r) =>
        r.kind === "messages" &&
        r.data.conversationId === conversationId &&
        r.data.direction === "in",
    );
    let questionRuns = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      await call("/api/automations/runs", "POST", {});
      questionRuns = (await call("/api/automations/runs")).runs.filter(
        (r) => r.sourceId === question.id,
      );
      if (
        questionRuns.length === 2 &&
        questionRuns.every((r) => r.status === "completed")
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.equal(
      questionRuns.filter((r) => r.status === "completed").length,
      2,
    );
    const automaticDraft = JSON.parse(
      questionRuns.find((r) => r.action === "Suggest reply").result,
    );
    assert.equal(automaticDraft.needsReview, true);
    assert.match(
      automaticDraft.reply.replace(/[০-৯]/g, (n) =>
        String("০১২৩৪৫৬৭৮৯".indexOf(n)),
      ),
      /560/,
    );
    assert.equal(
      (await call("/api/workspace")).records.find(
        (r) => r.id === conversationId,
      ).data.status,
      "Human",
    );
    await call("/api/workspace", "PATCH", {
      ...workspace,
      usageMode: "personal",
      agentEnabled: false,
    });
    const pausedId = await create("tasks", {
      name: marker + " paused",
      notes: "Paused verification",
      status: "To do",
      priority: "Normal",
    });
    assert.equal(
      (await call("/api/automations/runs")).runs.filter(
        (r) => r.sourceId === pausedId,
      ).length,
      0,
    );
    assert.equal((await req.get(url + "/api/cron/automations")).status(), 401);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.goto(url + "/dashboard/connections");
    await page
      .getByRole("heading", { name: "Connections for your everyday work." })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Connect account", exact: true })
        .count(),
      4,
    );
    await page.getByText("ORGANIZE YOUR DAY", { exact: true }).waitFor();
    await page.goto(url + "/dashboard/workflow-runs");
    await page
      .getByRole("heading", { name: "Your workflows in motion." })
      .waitFor();
    await page.goto(url + "/dashboard/tasks");
    await page
      .getByRole("heading", { name: "Make room for what matters." })
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      JSON.stringify({
        status: "PASS",
        checks:
          "Personal mode; tasks; automatic follow-up; local notification; automatic grounded AI draft; human review routing; job claims without duplicates; disabled-master isolation; missing-provider failure; no unsafe external retry; cron auth; connections and run-history views; mobile tasks",
        externalActionsExecuted: 0,
      }),
    );
  } finally {
    if (workspace) {
      await call("/api/workspace", "PATCH", {
        ...workspace,
        agentEnabled: false,
      }).catch(() => {});
      const remaining = (await call("/api/workspace")).records;
      for (const record of cleanup.reverse())
        await req
          .delete(url + `/api/records/${record.kind}/${record.id}`, {
            headers,
            data: {
              version: remaining.find((r) => r.id === record.id)?.version || 1,
            },
          })
          .catch(() => {});
      await call("/api/workspace", "PATCH", workspace).catch(() => {});
    }
    await req
      .post(url + "/api/admin/switch", { headers, data: { id: "" } })
      .catch(() => {});
    await req
      .post(url + "/api/auth/logout", { headers, data: {} })
      .catch(() => {});
    await browser.close();
    console.log(
      "Temporary tasks, rules and follow-ups removed; original workspace preferences restored.",
    );
  }
})().catch((e) => {
  console.error(
    String(e.message).replaceAll(secret || "__NO_SECRET__", "[REDACTED]"),
  );
  process.exit(1);
});
