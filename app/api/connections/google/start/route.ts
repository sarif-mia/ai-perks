import { z } from "zod";
import { body, context, json, route, HttpError } from "@/lib/server";
import { googleProviders, isGoogleProvider } from "@/lib/google-providers";
import { appURL, encryptionSecret, googleConfigured } from "@/lib/google";
import { encryptCredentials } from "@/lib/integration-crypto";
import { newToken, tokenHash } from "@/lib/auth";
import { config } from "@/lib/server";
export const POST = route(async (req) => {
  const { provider } = z
    .object({ provider: z.string().refine(isGoogleProvider) })
    .parse(await body(req));
  const { db, user, workspace } = await context();
  if (!googleConfigured())
    throw new HttpError(
      503,
      "The platform owner must configure Google OAuth before connecting accounts.",
    );
  const state = newToken(),
    verifier = newToken();
  const challenge = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(challenge)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  await db.batch([
    db.prepare("DELETE FROM oauth_states WHERE expires_at<?").bind(Date.now()),
    db
      .prepare(
        "INSERT INTO oauth_states(state_hash,user_id,workspace_id,provider,verifier,expires_at) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        await tokenHash(state),
        user.userId,
        workspace.id,
        provider,
        await encryptCredentials({ value: verifier }, encryptionSecret()),
        Date.now() + 600000,
      ),
  ]);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config().GOOGLE_CLIENT_ID!,
    redirect_uri: appURL() + "/api/connections/google/callback",
    response_type: "code",
    scope: "openid email " + googleProviders[provider].scope,
    state,
    access_type: "offline",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return json({ url: url.href });
});
