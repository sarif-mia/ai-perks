import bcrypt from "bcryptjs";
import { database, HttpError } from "./server";
import { cookie, newToken, tokenHash } from "./auth";
export async function rateLimit(req: Request, scope: string, email: string) {
  const id = await tokenHash(
    scope +
      ":" +
      (req.headers.get("cf-connecting-ip") || "local") +
      ":" +
      email,
  );
  const now = Date.now();
  const limit = scope === "signup" ? 10 : 15;
  const reset = now + 15 * 60 * 1000;
  const result = await database()
    .prepare(
      "INSERT INTO auth_rates (id,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING attempts",
    )
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
