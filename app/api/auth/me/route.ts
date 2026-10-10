import { getSessionUser } from "@/lib/auth";
import { json, route, HttpError } from "@/lib/server";
export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return json({ name: user.displayName, email: user.email });
});
