import { runtime } from "@runtime";
import { getSessionUser } from "@/lib/auth";
import { ZodError } from "zod";
import type { Kind, Payload, RecordItem, Workspace } from "./models";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  if (!runtime().DB) throw new HttpError(503, "Database is not configured.");
  return runtime().DB!;
}
export function config() {
  return runtime() as unknown as Record<string, string | undefined>;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof ZodError)
        return json(
          {
            error: e.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
          422,
        );
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error("Request failed", e instanceof Error ? e.name : "Unknown");
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new HttpError(403, "Invalid request origin.");
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Use application/json.");
}
export async function body(req: Request) {
  checkOrigin(req);
  const raw = await req.text();
  if (raw.length > 60000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
interface WorkspaceRow {
  id: string;
  owner_id: string;
  name: string;
  owner_name: string;
  currency: string;
  language: string;
  agent_enabled: number;
  dark_mode: number;
  sample_imported: number;
  suspended: number;
  usage_mode: "personal" | "business";
}
export function mapWorkspace(w: WorkspaceRow): Workspace {
  return {
    usageMode: w.usage_mode,
    id: w.id,
    name: w.name,
    ownerName: w.owner_name,
    currency: w.currency,
    language: w.language,
    agentEnabled: !!w.agent_enabled,
    darkMode: !!w.dark_mode,
  };
}
export async function context() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  const db = database();
  let row = await db
    .prepare("SELECT * FROM workspaces WHERE owner_id=?")
    .bind(user.userId)
    .first<WorkspaceRow>();
  if (!row) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT OR IGNORE INTO workspaces (id,owner_id,name,owner_name,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(
        id,
        user.userId,
        "My business",
        user.fullName || "Business owner",
        new Date().toISOString(),
      )
      .run();
    row = await db
      .prepare("SELECT * FROM workspaces WHERE owner_id=?")
      .bind(user.userId)
      .first<WorkspaceRow>();
  }
  if (user.role === "superadmin" && user.workspaceId) {
    const selected = await db
      .prepare("SELECT * FROM workspaces WHERE id=?")
      .bind(user.workspaceId)
      .first<WorkspaceRow>();
    if (selected) row = selected;
  }
  if (!row) throw new HttpError(500, "Workspace could not be loaded.");
  if (row.suspended && user.role !== "superadmin")
    throw new HttpError(
      403,
      "This company is suspended. Contact the administrator.",
    );
  return {
    db,
    user,
    workspace: mapWorkspace(row),
    sampleImported: !!row.sample_imported,
  };
}
interface RecordRow {
  id: string;
  kind: Kind;
  title: string;
  payload: string;
  version: number;
  created_at: string;
  updated_at: string;
}
export function mapRecord(r: RecordRow): RecordItem {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    data: JSON.parse(r.payload),
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
export async function listRecords(workspaceId: string, kind?: Kind) {
  const sql = kind
    ? "SELECT * FROM records WHERE workspace_id=? AND kind=? ORDER BY created_at DESC LIMIT 2000"
    : "SELECT * FROM records WHERE workspace_id=? ORDER BY created_at DESC LIMIT 4000";
  const stmt = database().prepare(sql);
  const { results } = await (
    kind ? stmt.bind(workspaceId, kind) : stmt.bind(workspaceId)
  ).all<RecordRow>();
  return results.map(mapRecord);
}
export async function getRecord(workspaceId: string, kind: Kind, id: string) {
  const row = await database()
    .prepare("SELECT * FROM records WHERE workspace_id=? AND kind=? AND id=?")
    .bind(workspaceId, kind, id)
    .first<RecordRow>();
  if (!row) throw new HttpError(404, "Record not found.");
  return mapRecord(row);
}
export function eventStatement(
  workspaceId: string,
  kind: string,
  action: string,
) {
  return database()
    .prepare(
      "INSERT INTO events (id,workspace_id,action,entity_kind,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      workspaceId,
      action,
      kind,
      new Date().toISOString(),
    );
}
export function insertStatement(
  workspaceId: string,
  kind: Kind,
  data: Payload,
  id = crypto.randomUUID(),
) {
  const now = new Date().toISOString();
  return database()
    .prepare(
      "INSERT INTO records (id,workspace_id,kind,title,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      id,
      workspaceId,
      kind,
      String(data.name || data.text || kind).slice(0, 200),
      JSON.stringify(data),
      now,
      now,
    );
}
