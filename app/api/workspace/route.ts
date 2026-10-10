import {
  body,
  config,
  context,
  eventStatement,
  json,
  listRecords,
  route,
} from "@/lib/server";
import { workspaceSchema } from "@/lib/models";
export const GET = route(async () => {
  const { db, user, workspace, sampleImported } = await context();
  const [records, { results }] = await Promise.all([
    listRecords(workspace.id),
    db
      .prepare(
        "SELECT id,action,entity_kind AS entityKind,created_at AS createdAt FROM events WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .bind(workspace.id)
      .all(),
  ]);
  const c = config();
  return json({
    workspace,
    records,
    events: results,
    user: { name: user.displayName, email: user.email, role: user.role },
    integrations: {
      ai: !!(c.GEMINI_API_KEY || (c.ANTHROPIC_API_KEY && c.ANTHROPIC_MODEL)),
      messenger: !!(
        c.META_PAGE_ACCESS_TOKEN &&
        c.META_APP_SECRET &&
        c.META_PAGE_ID &&
        c.META_WORKSPACE_ID === workspace.id &&
        c.META_GRAPH_VERSION
      ),
    },
    sampleImported,
  });
});
export const PATCH = route(async (req) => {
  const data = workspaceSchema.parse(await body(req));
  const { db, workspace } = await context();
  await db.batch([
    db
      .prepare(
        "UPDATE workspaces SET name=?,owner_name=?,currency=?,language=?,agent_enabled=?,dark_mode=?,usage_mode=? WHERE id=?",
      )
      .bind(
        data.name,
        data.ownerName,
        data.currency,
        data.language,
        Number(data.agentEnabled),
        Number(data.darkMode),
        data.usageMode,
        workspace.id,
      ),
    eventStatement(workspace.id, "settings", "Workspace preferences updated"),
  ]);
  return json({ ok: true });
});
