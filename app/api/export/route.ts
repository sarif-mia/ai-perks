import { context, HttpError, listRecords, route } from "@/lib/server";
import { isKind } from "@/lib/models";
export const GET = route(async (req) => {
  const kind = new URL(req.url).searchParams.get("kind") || "orders";
  if (!isKind(kind) || kind === "messages")
    throw new HttpError(400, "Invalid export collection.");
  const { workspace } = await context();
  const records = await listRecords(workspace.id, kind);
  const fields = [...new Set(records.flatMap((r) => Object.keys(r.data)))];
  const escape = (s: unknown) =>
    '"' +
    String(s ?? "")
      .replace(/"/g, '""')
      .replace(/^[=+@-]/, "'$&") +
    '"';
  const rows = [
    ["id", ...fields, "createdAt"],
    ...records.map((r) => [r.id, ...fields.map((k) => r.data[k]), r.createdAt]),
  ];
  return new Response(
    "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-perks-${kind}.csv"`,
        "Cache-Control": "no-store",
      },
    },
  );
});
