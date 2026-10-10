import { body, database, json, route } from "@/lib/server";
import { cookie, sessionToken, tokenHash } from "@/lib/auth";
export const POST = route(async (req) => {
  await body(req);
  const token = sessionToken(req);
  if (token)
    await database()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await tokenHash(token))
      .run();
  const res = json({ ok: true });
  res.headers.set("Set-Cookie", cookie("", req, true));
  return res;
});
