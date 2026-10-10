export const googleProviders = {
  "google-gmail": {
    name: "Gmail",
    scope: "https://www.googleapis.com/auth/gmail.compose",
    description:
      "Create email drafts in your account for review. Emails are not sent automatically.",
    action: "Create Gmail draft",
  },
  "google-calendar": {
    name: "Google Calendar",
    scope: "https://www.googleapis.com/auth/calendar.events",
    description:
      "Create calendar events for bookings and reminders. No guest invitations are sent.",
    action: "Add Calendar event",
  },
  "google-sheets": {
    name: "Google Sheets",
    scope: "https://www.googleapis.com/auth/drive.file",
    description:
      "Export records into a spreadsheet created by AI Perks. Existing Drive files are not imported.",
    action: "Add Sheets row",
  },
  "google-tasks": {
    name: "Google Tasks",
    scope: "https://www.googleapis.com/auth/tasks",
    description: "Create tasks and follow-ups in your Google task list.",
    action: "Add Google task",
  },
} as const;
export type GoogleProvider = keyof typeof googleProviders;
export function isGoogleProvider(value: string): value is GoogleProvider {
  return Object.hasOwn(googleProviders, value);
}
