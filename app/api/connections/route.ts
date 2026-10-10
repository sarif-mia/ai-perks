import { z } from "zod";
import { body, context, json, route, eventStatement } from "@/lib/server";
import { googleProviders, isGoogleProvider } from "@/lib/google-providers";
import { googleConfigured } from "@/lib/google";
export const GET = route(async () => {
  const { db, workspace } = await context();
  const { results } = await db
    .prepare(
      "SELECT provider,account_email AS accountEmail,config,updated_at AS updatedAt FROM integrations WHERE workspace_id=?",
    )
    .bind(workspace.id)
    .all<{
      provider: string;
      accountEmail: string;
      config: string;
      updatedAt: string;
    }>();
  return json({
    googleConfigured: googleConfigured(),
    providers: Object.entries(googleProviders).map(([id, definition]) => {
      const row = results.find((r) => r.provider === id);
      const details = row ? JSON.parse(row.config) : {};
      return {
        id,
        ...definition,
        connected: !!row,
        accountEmail: row?.accountEmail,
        updatedAt: row?.updatedAt,
        spreadsheetId: details.spreadsheetId,
      };
    }),
  });
});
export const DELETE = route(async (req) => {
  const { provider } = z
    .object({ provider: z.string().refine(isGoogleProvider) })
    .parse(await body(req));
  const { db, workspace } = await context();
  await db.batch([
    db
      .prepare("DELETE FROM integrations WHERE workspace_id=? AND provider=?")
      .bind(workspace.id, provider),
    eventStatement(
      workspace.id,
      "connections",
      provider + " disconnected locally",
    ),
  ]);
  return json({ ok: true });
});
