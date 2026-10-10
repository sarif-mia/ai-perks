import {
  database,
  listRecords,
  getRecord,
  eventStatement,
  insertStatement,
  HttpError,
} from "./server";
import type { Kind, Payload } from "./models";
import { workflowTriggers, retryableAction } from "./workflow-policy";
import { generateReply } from "./ai";
import { replyContext } from "./reply-context";
import { googleAction } from "./google-actions";
import type { SqlStatement } from "./sql";
export type Run = {
  id: string;
  workspace_id: string;
  automation_id: string;
  source_id: string;
  source_kind: Kind;
  action: string;
  instructions: string;
  status: string;
  result: string;
  created_at: string;
  updated_at: string;
};
export async function planAutomations(
  workspaceId: string,
  kind: Kind,
  id: string,
  data: Payload,
  version = 1,
  previous?: Payload,
): Promise<SqlStatement[]> {
  const triggers = workflowTriggers(kind, data, previous);
  if (!triggers.length) return [];
  const db = database();
  const active = await db
    .prepare(
      "SELECT agent_enabled,suspended,approval_status FROM workspaces WHERE id=?",
    )
    .bind(workspaceId)
    .first<{
      agent_enabled: number;
      suspended: number;
      approval_status: string;
    }>();
  if (
    !active?.agent_enabled ||
    active.suspended ||
    active.approval_status !== "approved"
  )
    return [];
  const rules = (await listRecords(workspaceId, "automations")).filter(
    (r) => r.data.enabled && triggers.includes(String(r.data.trigger)),
  );
  const now = new Date().toISOString();
  return rules.map((rule) =>
    db
      .prepare(
        "INSERT INTO automation_runs(id,workspace_id,automation_id,source_key,source_id,source_kind,action,instructions,status,result,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(automation_id,source_key) DO NOTHING",
      )
      .bind(
        crypto.randomUUID(),
        workspaceId,
        rule.id,
        `${kind}:${id}:${version}:${rule.data.trigger}`,
        id,
        kind,
        String(rule.data.action),
        String(rule.data.instructions || ""),
        "pending",
        "",
        now,
        now,
      ),
  );
}
async function execute(run: Run) {
  const record = await getRecord(
    run.workspace_id,
    run.source_kind,
    run.source_id,
  );
  const db = database();
  if (run.action === "Suggest reply") {
    const conversationId =
      record.kind === "messages"
        ? String(record.data.conversationId)
        : record.kind === "conversations"
          ? record.id
          : "";
    if (!conversationId)
      throw new HttpError(422, "AI reply suggestions require a conversation.");
    const records = await listRecords(run.workspace_id);
    const context = replyContext(records, conversationId);
    if (!context)
      return { message: "Waiting for an incoming customer question." };
    const knowledge = records
      .filter(
        (r) =>
          ["knowledge", "products"].includes(r.kind) &&
          r.data.status === "Active",
      )
      .map((r) => JSON.stringify(r.data))
      .join("\n");
    const recent = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM events WHERE workspace_id=? AND entity_kind='ai' AND created_at>?",
      )
      .bind(run.workspace_id, new Date(Date.now() - 60000).toISOString())
      .first<{ n: number }>();
    if (Number(recent?.n || 0) >= 8)
      throw new HttpError(
        429,
        "AI draft limit reached. Retry after one minute.",
      );
    await eventStatement(
      run.workspace_id,
      "ai",
      "Automation AI draft requested",
    ).run();
    const reply = await generateReply(
      context.prompt,
      knowledge,
      context.history,
    );
    return {
      message: "AI reply drafted for review.",
      reply,
      conversationId,
      needsReview: true,
    };
  }
  if (run.action === "Create follow-up") {
    if (
      await db
        .prepare(
          "SELECT id FROM records WHERE id=? AND workspace_id=? AND kind='followups'",
        )
        .bind(run.id, run.workspace_id)
        .first()
    )
      return { message: "Follow-up already created.", recordId: run.id };
    const due = String(
      record.data.due ||
        new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    );
    await db.batch([
      insertStatement(
        run.workspace_id,
        "followups",
        {
          name: record.title,
          channel: ["Website", "Messenger", "WhatsApp", "Instagram"].includes(
            String(record.data.channel),
          )
            ? String(record.data.channel)
            : "Website",
          message:
            run.instructions || "Review and follow up with " + record.title,
          due,
          status: "Scheduled",
          priority: "Warm",
        },
        run.id,
      ),
      eventStatement(
        run.workspace_id,
        "automation",
        "Follow-up created by workflow",
      ),
    ]);
    return {
      message: "Follow-up created in your workspace.",
      recordId: run.id,
    };
  }
  const reviewRecord =
    run.action === "Request review" && record.kind === "messages"
      ? await getRecord(
          run.workspace_id,
          "conversations",
          String(record.data.conversationId),
        )
      : record;
  if (
    run.action === "Request review" &&
    reviewRecord.kind === "conversations"
  ) {
    if (reviewRecord.data.status === "Human")
      return { message: "Conversation already marked for human review." };
    const updateResult = await db
      .prepare(
        "UPDATE records SET payload=?,version=version+1,updated_at=? WHERE id=? AND workspace_id=? AND version=?",
      )
      .bind(
        JSON.stringify({ ...reviewRecord.data, status: "Human" }),
        new Date().toISOString(),
        reviewRecord.id,
        run.workspace_id,
        reviewRecord.version,
      )
      .run();
    if (!updateResult.meta.changes)
      throw new HttpError(
        409,
        "Conversation changed. Retry this local action.",
      );
    await eventStatement(
      run.workspace_id,
      "automation",
      "Review requested: " + reviewRecord.title,
    ).run();
    return { message: "Conversation marked for human review." };
  }
  if (run.action === "Notify team" || run.action === "Request review") {
    await db
      .prepare(
        "INSERT INTO events(id,workspace_id,action,entity_kind,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(
        run.id,
        run.workspace_id,
        "Workflow notification: " +
          record.title +
          (run.instructions ? " — " + run.instructions.slice(0, 500) : ""),
        "notification",
        new Date().toISOString(),
      )
      .run();
    return { message: "Notification saved in workspace activity." };
  }
  return googleAction(
    run.workspace_id,
    run.action,
    record,
    run.instructions,
    run.id,
  );
}
export async function processRuns(workspaceId?: string, limit = 3) {
  const db = database();
  const started = Date.now();
  const query = workspaceId
    ? "SELECT * FROM automation_runs WHERE status='pending' AND workspace_id=? ORDER BY created_at ASC LIMIT ?"
    : "SELECT automation_runs.* FROM automation_runs JOIN workspaces ON workspaces.id=automation_runs.workspace_id WHERE automation_runs.status='pending' AND workspaces.agent_enabled=1 AND workspaces.suspended=0 AND workspaces.approval_status='approved' ORDER BY automation_runs.created_at ASC LIMIT ?";
  const { results } = await db
    .prepare(query)
    .bind(...(workspaceId ? [workspaceId, limit] : [limit]))
    .all<Run>();
  let count = 0;
  for (const run of results) {
    if (Date.now() - started > 45000) break;
    const active = await db
      .prepare(
        "SELECT agent_enabled,suspended,approval_status FROM workspaces WHERE id=?",
      )
      .bind(run.workspace_id)
      .first<{
        agent_enabled: number;
        suspended: number;
        approval_status: string;
      }>();
    if (
      !active?.agent_enabled ||
      active.suspended ||
      active.approval_status !== "approved"
    )
      continue;
    const rule = await db
      .prepare(
        "SELECT payload FROM records WHERE id=? AND workspace_id=? AND kind='automations'",
      )
      .bind(run.automation_id, run.workspace_id)
      .first<{ payload: string }>();
    const ruleData = rule ? JSON.parse(rule.payload) : null;
    if (
      !ruleData?.enabled ||
      ruleData.action !== run.action ||
      String(ruleData.instructions || "") !== run.instructions
    ) {
      await db
        .prepare(
          "UPDATE automation_runs SET status='skipped',result=?,updated_at=? WHERE id=? AND status='pending'",
        )
        .bind(
          JSON.stringify({ message: "Rule disabled, changed or removed." }),
          new Date().toISOString(),
          run.id,
        )
        .run();
      continue;
    }
    const claimed = await db
      .prepare(
        "UPDATE automation_runs SET status='running',updated_at=? WHERE id=? AND status='pending' RETURNING id",
      )
      .bind(new Date().toISOString(), run.id)
      .first();
    if (!claimed) continue;
    try {
      const result = await execute(run);
      await db
        .prepare(
          "UPDATE automation_runs SET status='completed',result=?,updated_at=? WHERE id=?",
        )
        .bind(JSON.stringify(result), new Date().toISOString(), run.id)
        .run();
    } catch (e) {
      await db
        .prepare(
          "UPDATE automation_runs SET status='failed',result=?,updated_at=? WHERE id=?",
        )
        .bind(
          JSON.stringify({
            message:
              e instanceof HttpError
                ? e.message
                : "Workflow could not complete. Check the source record and connected service.",
            retryable: retryableAction(run.action),
          }),
          new Date().toISOString(),
          run.id,
        )
        .run();
    }
    count++;
  }
  return count;
}
