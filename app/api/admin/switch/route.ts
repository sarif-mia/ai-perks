import { z } from "zod";
import { adminContext, workspaceCookie } from "@/lib/admin";
import { body, HttpError, json, route } from "@/lib/server";
export const POST = route(async (req) => {
  const { id } = z
    .object({ id: z.union([z.string().uuid(), z.literal("")]) })
    .parse(await body(req));
  const { db } = await adminContext();
  if (
    id &&
    !(await db.prepare("SELECT id FROM workspaces WHERE id=?").bind(id).first())
  )
    throw new HttpError(404, "Company not found.");
  const res = json({ ok: true });
  res.headers.set("Set-Cookie", workspaceCookie(id, req));
  return res;
});
