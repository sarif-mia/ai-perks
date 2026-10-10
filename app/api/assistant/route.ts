import { z } from "zod";
import {
  body,
  context,
  database,
  HttpError,
  json,
  listRecords,
  route,
} from "@/lib/server";
import { generateReply } from "@/lib/ai";
export const POST = route(async (req) => {
  const { prompt } = z
    .object({ prompt: z.string().trim().min(1).max(4000) })
    .parse(await body(req));
  const { workspace } = await context();
  const recent = await database()
    .prepare(
      "SELECT COUNT(*) AS n FROM events WHERE workspace_id=? AND entity_kind='ai' AND created_at>?",
    )
    .bind(workspace.id, new Date(Date.now() - 60000).toISOString())
    .first<{ n: number }>();
  if ((recent?.n || 0) >= 8)
    throw new HttpError(429, "Please wait a moment before asking again.");
  const id = crypto.randomUUID();
  await database()
    .prepare(
      "INSERT INTO events (id,workspace_id,action,entity_kind,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(
      id,
      workspace.id,
      "AI draft requested",
      "ai",
      new Date().toISOString(),
    )
    .run();
  const knowledge = (await listRecords(workspace.id))
    .filter(
      (r) =>
        (r.kind === "knowledge" || r.kind === "products") &&
        r.data.status === "Active",
    )
    .map((r) => JSON.stringify(r.data))
    .join("\n");
  const reply = await generateReply(prompt, knowledge);
  return json({ reply, source: "Anthropic", needsReview: true });
});
