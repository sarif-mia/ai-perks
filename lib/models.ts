import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(4000).default("");
const number = z.coerce.number().finite().min(0).max(100000000);
export const schemas = {
  conversations: z.object({
    name: text,
    channel: z.enum(["Website", "Messenger", "WhatsApp", "Instagram"]),
    status: z.enum(["AI", "Waiting", "Human", "Resolved"]),
    customerId: optional,
    summary: optional,
  }),
  messages: z.object({
    conversationId: text,
    text: z.string().trim().min(1).max(4000),
    direction: z.enum(["in", "out"]),
    delivery: z.enum(["Local", "Received", "Sent", "Failed"]),
    externalId: optional,
  }),
  leads: z.object({
    name: text,
    email: z.union([z.literal(""), z.string().email()]).default(""),
    phone: optional,
    interest: text,
    value: number,
    stage: z.enum([
      "New",
      "Contacted",
      "Qualified",
      "Follow-up",
      "Won",
      "Lost",
    ]),
    followup: z.string().max(20).default(""),
    priority: z.enum(["Hot", "Warm", "Cold"]),
  }),
  orders: z.object({
    name: text,
    product: text,
    quantity: z.coerce.number().int().min(1).max(10000),
    amount: number,
    status: z.enum([
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
    ]),
    channel: z.enum(["Website", "Messenger", "WhatsApp", "Instagram"]),
    phone: optional,
    address: optional,
  }),
  products: z.object({
    name: text,
    sku: text,
    price: number,
    stock: z.coerce.number().int().min(0).max(1000000),
    category: z.enum(["Clothing", "Accessories", "Services", "Other"]),
    description: optional,
    status: z.enum(["Active", "Draft"]),
  }),
  replies: z.object({
    name: text,
    shortcut: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(/^[a-z0-9_-]+$/i),
    content: z.string().trim().min(1).max(4000),
    category: z.enum(["General", "Orders", "Shipping", "Support"]),
  }),
  followups: z.object({
    name: text,
    channel: z.enum(["Website", "Messenger", "WhatsApp", "Instagram"]),
    message: z.string().trim().min(1).max(4000),
    due: text,
    status: z.enum(["Scheduled", "Done", "Cancelled"]),
    priority: z.enum(["Hot", "Warm", "Cold"]),
  }),
  broadcasts: z.object({
    name: text,
    channel: z.enum(["Messenger", "WhatsApp", "Instagram"]),
    audience: z.enum([
      "All eligible",
      "Hot leads",
      "Warm leads",
      "Recent customers",
    ]),
    content: z.string().trim().min(1).max(4000),
    scheduled: optional,
    status: z.enum(["Draft", "Scheduled", "Cancelled"]),
  }),
  posts: z.object({
    name: text,
    platform: z.enum(["Facebook", "Instagram"]),
    content: z.string().trim().min(1).max(4000),
    scheduled: optional,
    status: z.enum(["Draft", "Scheduled", "Published"]),
  }),
  knowledge: z.object({
    name: text,
    type: z.enum(["Policy", "FAQ", "Product info", "Brand guide"]),
    content: z.string().trim().min(1).max(20000),
    status: z.enum(["Active", "Draft"]),
  }),
  channels: z.object({
    name: text,
    platform: z.enum(["Website", "Messenger", "WhatsApp", "Instagram"]),
    externalId: optional,
    status: z.enum(["Not connected", "Sandbox"]),
    welcome: optional,
  }),
  team: z.object({
    name: text,
    email: z.string().email().max(200),
    role: z.enum(["Admin", "Agent", "Viewer"]),
    status: z.enum(["Roster only", "Inactive"]),
  }),
  bookings: z.object({
    name: text,
    service: text,
    date: text,
    time: text,
    status: z.enum(["Requested", "Confirmed", "Completed", "Cancelled"]),
    notes: optional,
  }),
  tasks: z.object({
    name: text,
    notes: optional,
    due: z.string().max(100).default(""),
    status: z.enum(["To do", "In progress", "Done"]),
    priority: z.enum(["Low", "Normal", "High"]),
  }),
  automations: z.object({
    name: text,
    trigger: z.enum([
      "New conversation",
      "Customer question",
      "Order confirmed",
      "Order shipped",
      "Conversation waiting",
      "New lead",
      "New task",
      "Follow-up scheduled",
      "Booking confirmed",
    ]),
    action: z.enum([
      "Suggest reply",
      "Notify team",
      "Create follow-up",
      "Request review",
      "Create Gmail draft",
      "Add Calendar event",
      "Add Sheets row",
      "Add Google task",
    ]),
    enabled: z.boolean(),
    instructions: optional,
  }),
  feedback: z.object({
    name: text,
    category: z.enum(["Feature request", "Bug report", "General"]),
    content: z.string().trim().min(1).max(4000),
    status: z.enum(["Open", "Reviewed"]),
  }),
} as const;
export type Kind = keyof typeof schemas;
export type Payload = Record<string, string | number | boolean>;
export interface RecordItem {
  id: string;
  kind: Kind;
  title: string;
  data: Payload;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Workspace {
  id: string;
  name: string;
  ownerName: string;
  currency: string;
  language: string;
  usageMode?: "personal" | "business";
  agentEnabled: boolean;
  darkMode: boolean;
}
export interface EventItem {
  id: string;
  action: string;
  entityKind: string;
  createdAt: string;
}
export interface Snapshot {
  workspace: Workspace;
  records: RecordItem[];
  events: EventItem[];
  user: { name: string; email: string; role?: string };
  integrations: { ai: boolean; messenger: boolean };
  sampleImported: boolean;
}
export function isKind(value: string): value is Kind {
  return Object.hasOwn(schemas, value);
}
export function validate(kind: Kind, data: unknown): Payload {
  return schemas[kind].parse(data) as Payload;
}
export function titleFor(kind: Kind, data: Payload) {
  return String(data.name || data.text || kind).slice(0, 200);
}
export const workspaceSchema = z.object({
  name: text,
  usageMode: z.enum(["personal", "business"]).default("business"),
  ownerName: text,
  currency: z.enum(["BDT", "USD"]),
  language: z.enum(["English", "বাংলা", "Auto-detect"]),
  agentEnabled: z.boolean(),
  darkMode: z.boolean(),
});
