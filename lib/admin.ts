import { getSessionUser } from "./auth";
import { database, HttpError } from "./server";
export async function adminContext() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (user.role !== "superadmin")
    throw new HttpError(403, "Super-admin access is required.");
  return { db: database(), user };
}
export function workspaceCookie(id: string, req: Request) {
  return `ai_perks_workspace=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${id ? 604800 : 0}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
