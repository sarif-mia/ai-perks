import { z } from "zod";
import { passwordSchema } from "@/lib/auth-validation";
import { body, database, HttpError, json, route } from "@/lib/server";
import { hashPassword, rateLimit } from "@/lib/auth-server";
const schema = z.object({
  usageMode: z.enum(["personal", "business"]).default("business"),
  companyName: z.string().trim().min(2).max(200),
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
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        id,
        data.email,
        data.name,
        await hashPassword(data.password),
        "member",
        now,
      ),
    db
      .prepare(
        "INSERT INTO workspaces (id,owner_id,name,owner_name,approval_status,usage_mode,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        data.companyName,
        data.name,
        "pending",
        data.usageMode,
        now,
      ),
  ]);
  return json(
    {
      ok: true,
      status: "pending",
      message:
        "Your workspace registration is awaiting administrator approval. Sign in after approval.",
    },
    201,
  );
});
