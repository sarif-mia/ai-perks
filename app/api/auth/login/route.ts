import { z } from "zod";
import { body, database, HttpError, json, route } from "@/lib/server";
import {
  createSession,
  hashPassword,
  rateLimit,
  verifyPassword,
} from "@/lib/auth-server";
const schema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const POST = route(async (req) => {
  const data = schema.parse(await body(req));
  await rateLimit(req, "login-ip", "");
  await rateLimit(req, "login", data.email);
  const user = await database()
    .prepare("SELECT id,password_hash,role FROM users WHERE email=?")
    .bind(data.email)
    .first<{ id: string; password_hash: string; role: string }>();
  const valid = user
    ? await verifyPassword(data.password, user.password_hash)
    : (await hashPassword(data.password), false);
  if (!valid || !user)
    throw new HttpError(401, "Email or password is incorrect.");
  const res = json({ ok: true, role: user.role });
  res.headers.set("Set-Cookie", await createSession(user.id, req));
  return res;
});
