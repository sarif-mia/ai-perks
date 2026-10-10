import { z } from "zod";
import { body, context, HttpError, json, route } from "@/lib/server";
import { processRuns } from "@/lib/automations";
import { retryableAction } from "@/lib/workflow-policy";
export const maxDuration = 60;
export const GET = route(async () => {
  const { db, workspace } = await context();
  const { results } = await db
    .prepare(
      "SELECT id,automation_id AS automationId,source_id AS sourceId,source_kind AS sourceKind,action,status,result,created_at AS createdAt,updated_at AS updatedAt FROM automation_runs WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(workspace.id)
    .all();
  return json({ runs: results });
});
export const POST = route(async (req) => {
  const { retryId } = z
    .object({ retryId: z.string().uuid().optional() })
    .parse(await body(req));
  const { db, workspace } = await context();
  if (!workspace.agentEnabled)
    throw new HttpError(
      409,
      "Enable the automation master switch in Settings first.",
    );
  if (retryId) {
    const run = await db
      .prepare(
        "SELECT action,status FROM automation_runs WHERE id=? AND workspace_id=?",
      )
      .bind(retryId, workspace.id)
      .first<{ action: string; status: string }>();
    if (!run) throw new HttpError(404, "Workflow run not found.");
    if (run.status !== "failed" || !retryableAction(run.action))
      throw new HttpError(
        422,
        "This operation cannot be retried automatically. Inspect the connected service before creating another action.",
      );
    await db
      .prepare(
        "UPDATE automation_runs SET status='pending',result='',updated_at=? WHERE id=? AND workspace_id=? AND status='failed'",
      )
      .bind(new Date().toISOString(), retryId, workspace.id)
      .run();
  }
  return json({ processed: await processRuns(workspace.id, 3) });
});
