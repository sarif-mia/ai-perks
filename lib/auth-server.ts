import { AUTH_RATE_SQL } from "./auth-rate-query";
import bcrypt from "bcryptjs";
import { database, HttpError } from "./server";
import { cookie, newToken, tokenHash } from "./auth";
export async function rateLimit(req: Request, scope: string, email: string) {
  const id = await tokenHash(
    scope +
      ":" +
      (req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-vercel-forwarded-for") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "local") +
      ":" +
      email,
  );
  const now = Date.now();
  const limit = scope === "signup" ? 10 : 15;
  const reset = now + 15 * 60 * 1000;
  const result = await database()
    .prepare(AUTH_RATE_SQL)
    .bind(id, reset, now, now, reset)
    .first<{ attempts: number }>();
  if ((result?.attempts || 0) > limit)
    throw new HttpError(
      429,
      "Too many attempts. Please wait 15 minutes and try again.",
    );
}
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
export async function createSession(userId: string, req: Request) {
  const token = newToken();
  await database().batch([
    database()
      .prepare("DELETE FROM sessions WHERE expires_at<?")
      .bind(Date.now()),
    database()
      .prepare(
        "INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)",
      )
      .bind(
        await tokenHash(token),
        userId,
        Date.now() + 604800000,
        new Date().toISOString(),
      ),
  ]);
  return cookie(token, req);
}
