import { test } from "node:test";
import assert from "node:assert/strict";
import { replyContext } from "../lib/reply-context.ts";
import type { RecordItem } from "../lib/models.ts";
const message = (
  id: string,
  conversationId: string,
  text: string,
  direction: string,
  date: string,
) =>
  ({
    id,
    kind: "messages",
    data: { conversationId, text, direction },
    createdAt: date,
    updatedAt: date,
    title: text,
    version: 1,
  }) as RecordItem;
test("conversation context isolates the thread and preserves speaker roles and order", () => {
  const result = replyContext(
    [
      message("3", "a", "What about delivery?", "in", "2026-01-03"),
      message("x", "b", "Private other customer", "in", "2026-01-02"),
      message("1", "a", "Price?", "in", "2026-01-01"),
      message("2", "a", "500 BDT", "out", "2026-01-02"),
    ],
    "a",
  );
  assert.deepEqual(result, {
    prompt: "What about delivery?",
    history: [
      { role: "user", content: "Price?" },
      { role: "assistant", content: "500 BDT" },
    ],
  });
});
test("a conversation without incoming customer text cannot generate a reply", () =>
  assert.equal(
    replyContext([message("1", "a", "Agent reply", "out", "2026-01-01")], "a"),
    null,
  ));
