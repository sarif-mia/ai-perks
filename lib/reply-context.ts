import type { RecordItem } from "./models.ts";
export function replyContext(records: RecordItem[], conversationId: string) {
  const messages = records
    .filter(
      (r) => r.kind === "messages" && r.data.conversationId === conversationId,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-12);
  const lastIncoming = messages.findLastIndex((r) => r.data.direction === "in");
  if (lastIncoming < 0) return null;
  return {
    prompt: String(messages[lastIncoming].data.text).slice(0, 4000),
    history: messages
      .slice(0, lastIncoming)
      .map((r) => ({
        role: (r.data.direction === "in" ? "user" : "assistant") as
          "user" | "assistant",
        content: String(r.data.text).slice(0, 4000),
      })),
  };
}
