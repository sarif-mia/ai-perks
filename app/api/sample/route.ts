import {
  body,
  context,
  eventStatement,
  HttpError,
  insertStatement,
  json,
  route,
} from "@/lib/server";
import { sampleData } from "@/lib/sample";
import { validate } from "@/lib/models";
export const POST = route(async (req) => {
  await body(req);
  const { db, workspace, sampleImported } = await context();
  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM records WHERE workspace_id=?")
    .bind(workspace.id)
    .first<{ n: number }>();
  if (sampleImported || count?.n)
    throw new HttpError(
      409,
      "Sample data can only be loaded into an empty workspace.",
    );
  const ids = new Map<string, string>();
  for (const s of sampleData) if (s.id) ids.set(s.id, crypto.randomUUID());
  const statements = sampleData.map((s) => {
    const data = { ...s.data };
    if (s.kind === "messages")
      data.conversationId = ids.get(String(data.conversationId))!;
    return insertStatement(
      workspace.id,
      s.kind,
      validate(s.kind, data),
      s.id ? ids.get(s.id) : undefined,
    );
  });
  await db.batch([
    ...statements,
    db
      .prepare("UPDATE workspaces SET name=?,sample_imported=1 WHERE id=?")
      .bind("Studio Commerce · Sample", workspace.id),
    eventStatement(workspace.id, "setup", "Sample workspace loaded"),
  ]);
  return json({ ok: true }, 201);
});
