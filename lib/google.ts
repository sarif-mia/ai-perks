import { config, database, HttpError } from "./server";
import { encryptCredentials, decryptCredentials } from "./integration-crypto";
import type { GoogleProvider } from "./google-providers";
type Credentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
export type Connection = {
  id: string;
  workspace_id: string;
  provider: GoogleProvider;
  account_email: string;
  credentials: string;
  config: string;
};
export function encryptionSecret() {
  const value = config().INTEGRATION_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new HttpError(503, "Connection encryption is not configured.");
  return value;
}
export function googleConfigured() {
  const c = config();
  return !!(
    c.GOOGLE_CLIENT_ID &&
    c.GOOGLE_CLIENT_SECRET &&
    c.INTEGRATION_ENCRYPTION_KEY
  );
}
export function appURL() {
  return config().APP_URL || "https://ai-perks-two.vercel.app";
}
export async function connection(
  workspaceId: string,
  provider: GoogleProvider,
) {
  const row = await database()
    .prepare("SELECT * FROM integrations WHERE workspace_id=? AND provider=?")
    .bind(workspaceId, provider)
    .first<Connection>();
  if (!row)
    throw new HttpError(
      409,
      "Connect this Google service in Connections first.",
    );
  return row;
}
async function accessToken(row: Connection) {
  const creds = await decryptCredentials<Credentials>(
    row.credentials,
    encryptionSecret(),
  );
  if (creds.expiresAt > Date.now() + 60000) return creds.accessToken;
  const c = config();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.GOOGLE_CLIENT_ID!,
      client_secret: c.GOOGLE_CLIENT_SECRET!,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new HttpError(
      409,
      "Google access expired or was revoked. Reconnect this service.",
    );
  const data = (await r.json()) as { access_token: string; expires_in: number };
  const updated = {
    ...creds,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await database()
    .prepare(
      "UPDATE integrations SET credentials=?,updated_at=? WHERE id=? AND workspace_id=?",
    )
    .bind(
      await encryptCredentials(updated, encryptionSecret()),
      new Date().toISOString(),
      row.id,
      row.workspace_id,
    )
    .run();
  return data.access_token;
}
export async function googleRequest<T = Record<string, unknown>>(
  row: Connection,
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const allowed = [
    "gmail.googleapis.com",
    "www.googleapis.com",
    "sheets.googleapis.com",
    "tasks.googleapis.com",
  ];
  if (!allowed.includes(new URL(url).hostname))
    throw new HttpError(422, "Invalid Google service.");
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken(row)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new HttpError(
      r.status === 401 ? 409 : 502,
      `Google request failed (${r.status}). Check API access and connection permissions.`,
    );
  if (r.status === 204) return {} as T;
  return r.json() as Promise<T>;
}
export async function saveGoogleConnection(
  workspaceId: string,
  provider: GoogleProvider,
  email: string,
  token: { access_token: string; refresh_token?: string; expires_in: number },
) {
  const db = database();
  const existing = await db
    .prepare("SELECT * FROM integrations WHERE workspace_id=? AND provider=?")
    .bind(workspaceId, provider)
    .first<Connection>();
  let refresh = token.refresh_token;
  if (!refresh && existing?.account_email === email)
    refresh = (
      await decryptCredentials<Credentials>(
        existing.credentials,
        encryptionSecret(),
      )
    ).refreshToken;
  if (!refresh)
    throw new HttpError(
      409,
      "Google did not grant offline access. Please reconnect and approve access.",
    );
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO integrations(id,workspace_id,provider,account_email,credentials,config,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(workspace_id,provider) DO UPDATE SET account_email=excluded.account_email,credentials=excluded.credentials,config=excluded.config,updated_at=excluded.updated_at",
    )
    .bind(
      existing?.id || crypto.randomUUID(),
      workspaceId,
      provider,
      email,
      await encryptCredentials(
        {
          accessToken: token.access_token,
          refreshToken: refresh,
          expiresAt: Date.now() + token.expires_in * 1000,
        },
        encryptionSecret(),
      ),
      existing?.account_email === email ? existing.config : "{}",
      now,
      now,
    )
    .run();
}
