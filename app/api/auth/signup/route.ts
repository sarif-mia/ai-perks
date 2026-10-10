import { z } from "zod";
import { passwordSchema } from "@/lib/auth-validation";
import { body, database, HttpError, json, route } from "@/lib/server";
import { createSession, hashPassword, rateLimit } from "@/lib/auth-server";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((e) => e.toLowerCase()),
  password: passwordSchema,
});
export const POST = route(async (req) => {
  const data = schema.parse(await body(req));
  await rateLimit(req, "signup", "");
  const db = database();
  const existing = await db
    .prepare("SELECT id FROM users WHERE email=?")
    .bind(data.email)
    .first();
  if (existing)
    throw new HttpError(
      409,
      "An account with this email already exists. Please sign in.",
    );
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        "INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(
        id,
        data.email,
        data.name,
        await hashPassword(data.password),
        new Date().toISOString(),
      )
      .run();
  } catch {
    throw new HttpError(
      409,
      "This account could not be created. Try signing in.",
    );
  }
  const res = json({ ok: true }, 201);
  res.headers.set("Set-Cookie", await createSession(id, req));
  return res;
});
