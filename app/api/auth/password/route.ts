import { z } from "zod";
import { passwordSchema } from "@/lib/auth-validation";
import { body, context, HttpError, json, route } from "@/lib/server";
import { cookie, tokenHash, sessionToken } from "@/lib/auth";
import { hashPassword, rateLimit, verifyPassword } from "@/lib/auth-server";
export const POST = route(async (req) => {
  const raw = z
    .object({
      currentPassword: z.string().min(1).max(72),
      password: passwordSchema,
    })
    .parse(await body(req));
  const { db, user } = await context();
  await rateLimit(req, "password", user.email);
  const row = await db
    .prepare("SELECT password_hash FROM users WHERE id=?")
    .bind(user.userId)
    .first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(raw.currentPassword, row.password_hash)))
    throw new HttpError(401, "Your current password is incorrect.");
  await db.batch([
    db
      .prepare("UPDATE users SET password_hash=? WHERE id=?")
      .bind(await hashPassword(raw.password), user.userId),
    db.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.userId),
  ]);
  const res = json({ ok: true });
  res.headers.set("Set-Cookie", cookie("", req, true));
  return res;
});
