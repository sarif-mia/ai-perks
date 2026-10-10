import { z } from "zod";
import {
  body,
  config,
  context,
  eventStatement,
  getRecord,
  HttpError,
  insertStatement,
  json,
  route,
} from "@/lib/server";
import { validate } from "@/lib/models";
export const POST = route(async (req) => {
  const raw = z
    .object({
      text: z.string().trim().min(1).max(4000),
      sendExternally: z.boolean().default(false),
    })
    .parse(await body(req));
  const id = new URL(req.url).pathname.split("/")[3];
  const { db, workspace } = await context();
  const conversation = await getRecord(workspace.id, "conversations", id);
  let delivery = "Local";
  if (raw.sendExternally) {
    const c = config();
    if (
      conversation.data.channel !== "Messenger" ||
      !c.META_PAGE_ACCESS_TOKEN ||
      !c.META_GRAPH_VERSION ||
      c.META_WORKSPACE_ID !== workspace.id ||
      !conversation.data.customerId
    )
      throw new HttpError(
        503,
        "Messenger is not configured for this workspace.",
      );
    const recent = await db
      .prepare(
        "SELECT created_at FROM records WHERE workspace_id=? AND kind='messages' AND json_extract(payload,'$.conversationId')=? AND json_extract(payload,'$.direction')='in' ORDER BY created_at DESC LIMIT 1",
      )
      .bind(workspace.id, id)
      .first<{ created_at: string }>();
    if (
      !recent ||
      Date.now() - Date.parse(recent.created_at) > 24 * 60 * 60 * 1000
    )
      throw new HttpError(
        422,
        "The standard 24-hour reply window has expired.",
      );
    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(c.META_GRAPH_VERSION)}/me/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.META_PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: conversation.data.customerId },
          message: { text: raw.text },
          messaging_type: "RESPONSE",
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new HttpError(502, "Messenger could not deliver the message.");
    delivery = "Sent";
  }
  const data = validate("messages", {
    conversationId: id,
    text: raw.text,
    direction: "out",
    delivery,
  });
  await db.batch([
    insertStatement(workspace.id, "messages", data),
    eventStatement(
      workspace.id,
      "messages",
      `Reply ${delivery === "Sent" ? "sent" : "saved"} for ${conversation.title}`,
    ),
  ]);
  return json({ delivery }, 201);
});
