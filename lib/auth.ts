import { runtime } from "@runtime";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const SESSION_COOKIE = "ai_perks_session";
export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string;
  role: string;
  workspaceId?: string;
};
export function sessionToken(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(SESSION_COOKIE + "="))
      ?.slice(SESSION_COOKIE.length + 1) || ""
  );
}
export async function tokenHash(token: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function cookie(token: string, req: Request, remove = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${remove ? 0 : 604800}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!runtime().DB) return null;
  const h = await headers();
  const token = h
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await runtime()
    .DB!.prepare(
      "SELECT users.id,users.email,users.name,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?",
    )
    .bind(await tokenHash(token), Date.now())
    .first<{ id: string; email: string; name: string; role: string }>();
  return row
    ? {
        userId: row.id,
        email: row.email,
        displayName: row.name,
        fullName: row.name,
        role: row.role,
        workspaceId:
          row.role === "superadmin"
            ? h
                .get("cookie")
                ?.split(";")
                .map((v) => v.trim())
                .find((v) => v.startsWith("ai_perks_workspace="))
                ?.split("=")[1]
            : undefined,
      }
    : null;
}
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
