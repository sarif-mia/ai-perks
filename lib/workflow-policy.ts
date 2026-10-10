import type { Kind, Payload } from "./models.ts";
export function workflowTriggers(
  kind: Kind,
  data: Payload,
  previous?: Payload,
) {
  const result: string[] = [];
  if (kind === "conversations") {
    if (!previous) result.push("New conversation");
    if (data.status === "Waiting" && previous?.status !== "Waiting")
      result.push("Conversation waiting");
  }
  if (kind === "messages" && data.direction === "in")
    result.push("Customer question");
  if (kind === "orders" && data.status !== previous?.status) {
    if (data.status === "Confirmed") result.push("Order confirmed");
    if (data.status === "Shipped") result.push("Order shipped");
  }
  if (kind === "leads" && !previous) result.push("New lead");
  if (kind === "tasks" && !previous) result.push("New task");
  if (
    kind === "followups" &&
    data.status === "Scheduled" &&
    previous?.status !== "Scheduled"
  )
    result.push("Follow-up scheduled");
  if (
    kind === "bookings" &&
    data.status === "Confirmed" &&
    previous?.status !== "Confirmed"
  )
    result.push("Booking confirmed");
  return result;
}
export function retryableAction(action: string) {
  return [
    "Suggest reply",
    "Notify team",
    "Create follow-up",
    "Request review",
  ].includes(action);
}
export function gmailDraftRaw(subject: string, text: string, to = "") {
  if (/[\r\n]/.test(to)) throw new Error("Invalid recipient");
  const encodedSubject = btoa(
    Array.from(new TextEncoder().encode(subject), (v) =>
      String.fromCharCode(v),
    ).join(""),
  );
  const mime = [
    ...(to ? ["To: " + to] : []),
    "Subject: =?UTF-8?B?" + encodedSubject + "?=",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    "" + text,
  ].join("\r\n");
  return btoa(
    Array.from(new TextEncoder().encode(mime), (v) =>
      String.fromCharCode(v),
    ).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function calendarDates(due: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due))
    throw new Error("A valid due date is required");
  const date = new Date(due + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== due
  )
    throw new Error("A valid due date is required");
  return {
    start: { date: due },
    end: {
      date: new Date(date.getTime() + 86400000).toISOString().slice(0, 10),
    },
  };
}
