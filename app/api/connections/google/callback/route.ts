import {
  config,
  context,
  eventStatement,
  route,
  HttpError,
} from "@/lib/server";
import { appURL, encryptionSecret, saveGoogleConnection } from "@/lib/google";
import { decryptCredentials } from "@/lib/integration-crypto";
import { googleProviders, isGoogleProvider } from "@/lib/google-providers";
import { tokenHash } from "@/lib/auth";
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const { db, user, workspace } = await context();
  const state = url.searchParams.get("state");
  if (!state || !/^[a-f0-9]{64}$/.test(state))
    throw new HttpError(
      403,
      "Invalid connection state. Start again from Connections.",
    );
  const row = await db
    .prepare(
      "DELETE FROM oauth_states WHERE state_hash=? AND user_id=? AND workspace_id=? AND expires_at>? RETURNING provider,verifier",
    )
    .bind(await tokenHash(state), user.userId, workspace.id, Date.now())
    .first<{ provider: string; verifier: string }>();
  if (!row || !isGoogleProvider(row.provider))
    throw new HttpError(
      403,
      "This connection request expired or was already used.",
    );
  if (url.searchParams.has("error"))
    return Response.redirect(
      appURL() + "/dashboard/connections?error=permission_denied",
    );
  const code = url.searchParams.get("code");
  if (!code) throw new HttpError(422, "Missing Google authorization code.");
  const { value: verifier } = await decryptCredentials<{ value: string }>(
    row.verifier,
    encryptionSecret(),
  );
  const c = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: c.GOOGLE_CLIENT_ID!,
      client_secret: c.GOOGLE_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: appURL() + "/api/connections/google/callback",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "Google could not authorize the connection. Please try again.",
    );
  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  if (!token.scope?.split(" ").includes(googleProviders[row.provider].scope))
    throw new HttpError(403, "Required service access was not granted.");
  const accountResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!accountResponse.ok)
    throw new HttpError(502, "Google account verification failed.");
  const account = (await accountResponse.json()) as {
    email: string;
    email_verified: boolean;
  };
  if (!account.email_verified || !account.email)
    throw new HttpError(403, "A verified Google account is required.");
  await saveGoogleConnection(workspace.id, row.provider, account.email, token);
  await eventStatement(
    workspace.id,
    "connections",
    row.provider + " connected",
  ).run();
  return Response.redirect(
    appURL() +
      "/dashboard/connections?connected=" +
      encodeURIComponent(row.provider),
  );
});
