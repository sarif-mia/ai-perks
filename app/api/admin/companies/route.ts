import { z } from "zod";
import { adminContext } from "@/lib/admin";
import { body, eventStatement, HttpError, json, route } from "@/lib/server";
import { hashPassword } from "@/lib/auth-server";
import { passwordSchema } from "@/lib/auth-validation";
export const POST = route(async (req) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(200),
      ownerName: z.string().trim().min(2).max(100),
      email: z
        .string()
        .trim()
        .email()
        .max(200)
        .transform((e) => e.toLowerCase()),
      password: passwordSchema,
    })
    .parse(await body(req));
  const { db } = await adminContext();
  if (
    await db
      .prepare("SELECT id FROM users WHERE email=?")
      .bind(data.email)
      .first()
  )
    throw new HttpError(409, "This owner email already has an account.");
  const userId = crypto.randomUUID(),
    workspaceId = crypto.randomUUID(),
    now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        userId,
        data.email,
        data.ownerName,
        await hashPassword(data.password),
        "member",
        now,
      ),
    db
      .prepare(
        "INSERT INTO workspaces (id,owner_id,name,owner_name,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(workspaceId, userId, data.name, data.ownerName, now),
    eventStatement(workspaceId, "admin", "Company created by super-admin"),
  ]);
  return json({ id: workspaceId }, 201);
});
export const PATCH = route(async (req) => {
  const { id, suspended } = z
    .object({ id: z.string().uuid(), suspended: z.boolean() })
    .parse(await body(req));
  const { db, user } = await adminContext();
  const w = await db
    .prepare("SELECT id,owner_id FROM workspaces WHERE id=?")
    .bind(id)
    .first<{ id: string; owner_id: string }>();
  if (!w) throw new HttpError(404, "Company not found.");
  if (w.owner_id === user.userId)
    throw new HttpError(
      422,
      "You cannot suspend your own administration workspace.",
    );
  await db.batch([
    db
      .prepare("UPDATE workspaces SET suspended=? WHERE id=?")
      .bind(Number(suspended), id),
    eventStatement(
      id,
      "admin",
      suspended ? "Company suspended" : "Company reactivated",
    ),
  ]);
  return json({ ok: true });
});
