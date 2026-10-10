import { after } from "next/server";
import { planAutomations, processRuns } from "@/lib/automations";
export const maxDuration = 60;
import { z } from "zod";
import {
  body,
  context,
  eventStatement,
  getRecord,
  HttpError,
  json,
  route,
} from "@/lib/server";
import { isKind, titleFor, validate } from "@/lib/models";
function path(req: Request) {
  const parts = new URL(req.url).pathname.split("/");
  if (!isKind(parts[3]) || parts[3] === "messages")
    throw new HttpError(404, "Unknown collection.");
  return { kind: parts[3], id: parts[4] };
}
export const PATCH = route(async (req) => {
  const raw = z
    .object({ data: z.unknown(), version: z.number().int().positive() })
    .parse(await body(req));
  const { kind, id } = path(req);
  const data = validate(kind, raw.data);
  const { db, workspace } = await context();
  const previous = await getRecord(workspace.id, kind, id);
  const result = await db
    .prepare(
      "UPDATE records SET title=?,payload=?,version=version+1,updated_at=? WHERE id=? AND workspace_id=? AND kind=? AND version=?",
    )
    .bind(
      titleFor(kind, data),
      JSON.stringify(data),
      new Date().toISOString(),
      id,
      workspace.id,
      kind,
      raw.version,
    )
    .run();
  if (!result.meta.changes)
    throw new HttpError(409, "This record changed. Refresh and try again.");
  await db.batch([
    eventStatement(workspace.id, kind, `${data.name || kind} updated`),
    ...(await planAutomations(
      workspace.id,
      kind,
      id,
      data,
      raw.version + 1,
      previous.data,
    )),
  ]);
  after(() => processRuns(workspace.id).catch(() => 0));
  return json({ ok: true });
});
export const DELETE = route(async (req) => {
  const raw = z
    .object({ version: z.number().int().positive() })
    .parse(await body(req));
  const { kind, id } = path(req);
  if (kind === "orders")
    throw new HttpError(
      405,
      "Orders are retained for history. Cancel the order instead.",
    );
  const { db, workspace } = await context();
  const record = await getRecord(workspace.id, kind, id);
  const result = await db
    .prepare(
      "DELETE FROM records WHERE workspace_id=? AND kind=? AND id=? AND version=?",
    )
    .bind(workspace.id, kind, id, raw.version)
    .run();
  if (!result.meta.changes)
    throw new HttpError(409, "This record changed. Refresh and try again.");
  if (kind === "conversations")
    await db
      .prepare(
        "DELETE FROM records WHERE workspace_id=? AND kind='messages' AND json_extract(payload,'$.conversationId')=?",
      )
      .bind(workspace.id, id)
      .run();
  await eventStatement(workspace.id, kind, `${record.title} deleted`).run();
  return json({ ok: true });
});
