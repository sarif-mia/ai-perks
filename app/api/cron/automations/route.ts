import { config, database, HttpError, json, route } from "@/lib/server";
import { processRuns } from "@/lib/automations";
export const maxDuration = 60;
export const GET = route(async (req) => {
  const secret = config().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret)
    throw new HttpError(401, "Unauthorized");
  const db = database(),
    old = new Date(Date.now() - 300000).toISOString();
  await db
    .prepare(
      "UPDATE automation_runs SET status='failed',result=?,updated_at=? WHERE status='running' AND updated_at<?",
    )
    .bind(
      JSON.stringify({
        message: "Worker interrupted. Review the result before retrying.",
      }),
      new Date().toISOString(),
      old,
    )
    .run();
  return json({ processed: await processRuns(undefined, 5) });
});
