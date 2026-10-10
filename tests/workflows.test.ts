import { test } from "node:test";
import assert from "node:assert/strict";
import {
  workflowTriggers,
  calendarDates,
  gmailDraftRaw,
  retryableAction,
} from "../lib/workflow-policy.ts";
import {
  encryptCredentials,
  decryptCredentials,
} from "../lib/integration-crypto.ts";
test("workflow triggers fire on real transitions and incoming questions", () => {
  assert.deepEqual(
    workflowTriggers("orders", { status: "Confirmed" }, { status: "Pending" }),
    ["Order confirmed"],
  );
  assert.deepEqual(
    workflowTriggers(
      "orders",
      { status: "Confirmed" },
      { status: "Confirmed" },
    ),
    [],
  );
  assert.deepEqual(workflowTriggers("messages", { direction: "out" }), []);
  assert.deepEqual(workflowTriggers("messages", { direction: "in" }), [
    "Customer question",
  ]);
  assert.deepEqual(workflowTriggers("tasks", { name: "Task" }), ["New task"]);
  assert.deepEqual(
    workflowTriggers("tasks", { name: "Task" }, { name: "Old" }),
    [],
  );
});
test("calendar dates validate real dates and all-day end is exclusive", () => {
  assert.deepEqual(calendarDates("2026-12-31"), {
    start: { date: "2026-12-31" },
    end: { date: "2027-01-01" },
  });
  assert.throws(() => calendarDates("2026-02-30"));
  assert.throws(() => calendarDates("tomorrow"));
});
test("Gmail drafts preserve Bangla text and reject injected recipients", () => {
  const raw = gmailDraftRaw("পরীক্ষা", "হ্যালো", "owner@example.com");
  const text = new TextDecoder().decode(
    Uint8Array.from(atob(raw.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
      c.charCodeAt(0),
    ),
  );
  assert.match(text, /Content-Type: text\/plain; charset=UTF-8/);
  assert.match(text, /হ্যালো/);
  assert.throws(() =>
    gmailDraftRaw(
      "Hello",
      "Text",
      "owner@example.com\r\nBcc: other@example.com",
    ),
  );
});
test("external side effects cannot be automatically retried", () => {
  assert.equal(retryableAction("Add Sheets row"), false);
  assert.equal(retryableAction("Create Gmail draft"), false);
  assert.equal(retryableAction("Suggest reply"), true);
});
test("credentials are authenticated, encrypted and cannot be opened with another key", async () => {
  const key = "ab".repeat(32);
  const value = await encryptCredentials(
    { refreshToken: "private-test-token" },
    key,
  );
  assert.equal(value.includes("private-test-token"), false);
  assert.deepEqual(await decryptCredentials(value, key), {
    refreshToken: "private-test-token",
  });
  await assert.rejects(() => decryptCredentials(value, "cd".repeat(32)));
  const [iv, cipher] = value.split(".");
  await assert.rejects(() =>
    decryptCredentials(
      iv + "." + (cipher[0] === "A" ? "B" : "A") + cipher.slice(1),
      key,
    ),
  );
});
