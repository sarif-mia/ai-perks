import { connection, googleRequest } from "./google";
import { database, HttpError } from "./server";
import type { RecordItem } from "./models";
import { calendarDates, gmailDraftRaw } from "./workflow-policy";
export async function googleAction(
  workspaceId: string,
  action: string,
  record: RecordItem,
  instructions: string,
  runId: string,
) {
  const description = [
    instructions,
    String(
      record.data.notes || record.data.message || record.data.summary || "",
    ),
    "AI Perks reference: " + record.id,
    "Workflow: " + runId,
  ]
    .filter(Boolean)
    .join("\n");
  if (action === "Create Gmail draft") {
    const row = await connection(workspaceId, "google-gmail");
    const to = String(record.data.email || "");
    const data = await googleRequest<{ id: string }>(
      row,
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
      "POST",
      {
        message: {
          raw: gmailDraftRaw(
            record.title,
            instructions ||
              "Hello,\n\nFollowing up regarding " +
                record.title +
                ".\n\nPlease review and complete this draft before sending.",
            to,
          ),
        },
      },
    );
    return {
      message: "Gmail draft created for your review.",
      id: data.id,
      url: "https://mail.google.com/mail/#drafts",
    };
  }
  if (action === "Add Google task") {
    const row = await connection(workspaceId, "google-tasks");
    const due = String(record.data.due || record.data.date || "").slice(0, 10);
    if (due) calendarDates(due);
    const data = await googleRequest<{ id: string }>(
      row,
      "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
      "POST",
      {
        title: record.title,
        notes: description,
        ...(due ? { due: due + "T00:00:00.000Z" } : {}),
      },
    );
    return {
      message: "Task created in Google Tasks.",
      id: data.id,
      url: "https://tasks.google.com/",
    };
  }
  if (action === "Add Calendar event") {
    const row = await connection(workspaceId, "google-calendar");
    const due = String(record.data.due || record.data.date || "").slice(0, 10);
    if (!due)
      throw new HttpError(
        422,
        "This record needs a due date before creating a calendar event.",
      );
    const dates = calendarDates(due);
    const data = await googleRequest<{ id: string; htmlLink?: string }>(
      row,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
      "POST",
      {
        id: runId.replaceAll("-", ""),
        summary: record.title,
        description,
        ...dates,
      },
    );
    return {
      message: "All-day calendar event created. No guests invited.",
      id: data.id,
      url: data.htmlLink || "https://calendar.google.com/",
    };
  }
  if (action === "Add Sheets row") {
    const row = await connection(workspaceId, "google-sheets");
    const settings = JSON.parse(row.config) as { spreadsheetId?: string };
    if (!settings.spreadsheetId) {
      const sheet = await googleRequest<{ spreadsheetId: string }>(
        row,
        "https://sheets.googleapis.com/v4/spreadsheets",
        "POST",
        {
          properties: { title: "AI Perks workspace export" },
          sheets: [{ properties: { title: "Records" } }],
        },
      );
      settings.spreadsheetId = sheet.spreadsheetId;
      await database()
        .prepare(
          "UPDATE integrations SET config=?,updated_at=? WHERE id=? AND workspace_id=?",
        )
        .bind(
          JSON.stringify(settings),
          new Date().toISOString(),
          row.id,
          workspaceId,
        )
        .run();
      await googleRequest(
        row,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(settings.spreadsheetId)}/values/Records!A1?valueInputOption=RAW`,
        "PUT",
        {
          values: [["Workflow ID", "Date", "Record type", "Title", "Details"]],
        },
      );
    }
    await googleRequest(
      row,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(settings.spreadsheetId)}/values/Records!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      "POST",
      {
        values: [
          [
            runId,
            new Date().toISOString(),
            record.kind,
            record.title,
            JSON.stringify(record.data),
          ],
        ],
      },
    );
    return {
      message: "Record exported to Google Sheets.",
      url: `https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`,
    };
  }
  throw new HttpError(422, "Unsupported Google workflow action.");
}
