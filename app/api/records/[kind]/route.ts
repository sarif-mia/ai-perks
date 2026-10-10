import {
  body,
  context,
  eventStatement,
  HttpError,
  insertStatement,
  json,
  listRecords,
  route,
} from "@/lib/server";
import { isKind, validate } from "@/lib/models";
function kindFor(req: Request) {
  const k = new URL(req.url).pathname.split("/")[3];
  if (!isKind(k) || k === "messages")
    throw new HttpError(404, "Unknown collection.");
  return k;
}
export const GET = route(async (req) => {
  const kind = kindFor(req);
  const { workspace } = await context();
  return json(await listRecords(workspace.id, kind));
});
export const POST = route(async (req) => {
  const data = await body(req);
  const kind = kindFor(req);
  const parsed = validate(kind, data);
  const { db, workspace } = await context();
  const id = crypto.randomUUID();
  await db.batch([
    insertStatement(workspace.id, kind, parsed, id),
    eventStatement(workspace.id, kind, `${parsed.name || kind} created`),
  ]);
  return json({ id }, 201);
});
