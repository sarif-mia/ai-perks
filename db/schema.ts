import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().unique(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  currency: text("currency").notNull().default("BDT"),
  language: text("language").notNull().default("Auto-detect"),
  agentEnabled: integer("agent_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  darkMode: integer("dark_mode", { mode: "boolean" }).notNull().default(false),
  suspended: integer("suspended", { mode: "boolean" }).notNull().default(false),
  sampleImported: integer("sample_imported", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    payload: text("payload").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("records_workspace_kind").on(t.workspaceId, t.kind)],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    entityKind: text("entity_kind").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("events_workspace_time").on(t.workspaceId, t.createdAt)],
);
export const webhookReceipts = sqliteTable("webhook_receipts", {
  externalId: text("external_id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);
export const authRates = sqliteTable("auth_rates", {
  id: text("id").primaryKey(),
  attempts: integer("attempts").notNull(),
  resetAt: integer("reset_at").notNull(),
});
