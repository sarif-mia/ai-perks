import {
  config,
  database,
  HttpError,
  json,
  route,
  insertStatement,
  eventStatement,
} from "@/lib/server";
import { verifySignature } from "@/lib/webhook";
import { z } from "zod";
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const c = config();
  if (!c.META_VERIFY_TOKEN)
    throw new HttpError(503, "Webhook is not configured.");
  if (
    url.searchParams.get("hub.mode") !== "subscribe" ||
    url.searchParams.get("hub.verify_token") !== c.META_VERIFY_TOKEN
  )
    throw new HttpError(403, "Verification failed.");
  return new Response(url.searchParams.get("hub.challenge") || "", {
    headers: { "Content-Type": "text/plain" },
  });
});
const payload = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        id: z.string(),
        messaging: z
          .array(
            z.object({
              sender: z.object({ id: z.string() }),
              message: z
                .object({
                  mid: z.string(),
                  text: z.string().max(4000).optional(),
                  is_echo: z.boolean().optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .max(100),
});
export const POST = route(async (req) => {
  const c = config();
  if (!c.META_APP_SECRET || !c.META_WORKSPACE_ID || !c.META_PAGE_ID)
    throw new HttpError(503, "Webhook is not configured.");
  const raw = await req.text();
  if (raw.length > 500000) throw new HttpError(413, "Webhook is too large.");
  if (
    !(await verifySignature(
      raw,
      req.headers.get("x-hub-signature-256"),
      c.META_APP_SECRET,
    ))
  )
    throw new HttpError(401, "Invalid signature.");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
  const parsed = payload.parse(input);
  const db = database();
  const workspaceId = c.META_WORKSPACE_ID;
  const workspace = await db
    .prepare("SELECT id FROM workspaces WHERE id=?")
    .bind(workspaceId)
    .first();
  if (!workspace) throw new HttpError(503, "Workspace is not configured.");
  for (const entry of parsed.entry) {
    if (entry.id !== c.META_PAGE_ID) continue;
    for (const event of entry.messaging || []) {
      const m = event.message;
      if (!m || m.is_echo) continue;
      const exists = await db
        .prepare("SELECT external_id FROM webhook_receipts WHERE external_id=?")
        .bind(m.mid)
        .first();
      if (exists) continue;
      const found = await db
        .prepare(
          "SELECT id FROM records WHERE workspace_id=? AND kind='conversations' AND json_extract(payload,'$.customerId')=? LIMIT 1",
        )
        .bind(workspaceId, event.sender.id)
        .first<{ id: string }>();
      const conversationId = found?.id || crypto.randomUUID();
      const operations = [];
      if (!found)
        operations.push(
          insertStatement(
            workspaceId,
            "conversations",
            {
              name: "Messenger customer " + event.sender.id.slice(-4),
              channel: "Messenger",
              status: "Waiting",
              customerId: event.sender.id,
              summary: "New incoming message",
            },
            conversationId,
          ),
        );
      operations.push(
        db
          .prepare(
            "INSERT INTO webhook_receipts (external_id,created_at) VALUES (?,?)",
          )
          .bind(m.mid, new Date().toISOString()),
        insertStatement(workspaceId, "messages", {
          conversationId,
          text: m.text || "[Attachment received]",
          direction: "in",
          delivery: "Received",
          externalId: m.mid,
        }),
        eventStatement(workspaceId, "messages", "Messenger message received"),
      );
      await db.batch(operations);
    }
  }
  return json({ received: true });
});
