import type { Kind, Payload } from "./models";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "date"
    | "time"
    | "datetime-local"
    | "textarea"
    | "select"
    | "toggle";
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
  min?: number;
};
export type Module = {
  title: string;
  description: string;
  singular: string;
  kind: Kind;
  fields: Field[];
  note?: string;
};
const field = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  required = true,
): Field => ({ key, label, type, required });
const select = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  type: "select",
  options,
  default: options[0],
});
const channels = ["Website", "Messenger", "WhatsApp", "Instagram"];
export const modules: Record<string, Module> = {
  inbox: {
    title: "One inbox. Every conversation.",
    description: "A closer connection with every customer, on every channel.",
    singular: "test conversation",
    kind: "conversations",
    fields: [
      field("name", "Customer name"),
      select("channel", "Channel", channels),
      select("status", "Routing", ["Waiting", "Human", "AI", "Resolved"]),
      field("summary", "Context", "textarea", false),
      field("customerId", "Platform customer ID", "text", false),
    ],
  },
  leads: {
    title: "Relationships, ready to grow.",
    description: "Move every opportunity from first hello to a happy customer.",
    singular: "lead",
    kind: "leads",
    fields: [
      field("name", "Customer name"),
      field("email", "Email", "email", false),
      field("phone", "Phone", "text", false),
      field("interest", "Interest"),
      field("value", "Potential value", "number"),
      select("stage", "Stage", [
        "New",
        "Contacted",
        "Qualified",
        "Follow-up",
        "Won",
        "Lost",
      ]),
      select("priority", "Priority", ["Warm", "Hot", "Cold"]),
      field("followup", "Follow-up date", "date", false),
    ],
  },
  orders: {
    title: "Every order, beautifully organized.",
    description: "Your order book, from first conversation to the doorstep.",
    singular: "order",
    kind: "orders",
    fields: [
      field("name", "Customer name"),
      field("product", "Product name"),
      { ...field("quantity", "Quantity", "number"), default: 1, min: 1 },
      field("amount", "Total order amount", "number"),
      select("status", "Status", [
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
      ]),
      select("channel", "Channel", channels),
      field("phone", "Phone", "text", false),
      field("address", "Delivery address", "textarea", false),
    ],
    note: "Track fulfillment here. Courier bookings and payment processing are not connected. Orders are retained for history; cancel them instead of deleting.",
  },
  products: {
    title: "A catalog your agent can count on.",
    description:
      "Keep prices, stock and product details in one reliable place.",
    singular: "product",
    kind: "products",
    fields: [
      field("name", "Product name"),
      field("sku", "SKU"),
      field("price", "Price", "number"),
      field("stock", "Stock quantity", "number"),
      select("category", "Category", [
        "Clothing",
        "Accessories",
        "Services",
        "Other",
      ]),
      field("description", "Description", "textarea", false),
      select("status", "Status", ["Active", "Draft"]),
    ],
  },
  "saved-replies": {
    title: "The right words, ready when you are.",
    description: "Thoughtful answers your whole team can reuse.",
    singular: "saved reply",
    kind: "replies",
    fields: [
      field("name", "Reply name"),
      field("shortcut", "Shortcut (letters, numbers, dash)"),
      field("content", "Reply text", "textarea"),
      select("category", "Category", [
        "General",
        "Orders",
        "Shipping",
        "Support",
      ]),
    ],
  },
  followups: {
    title: "Keep the conversation going.",
    description: "Plan a thoughtful reminder at just the right moment.",
    singular: "follow-up",
    kind: "followups",
    fields: [
      field("name", "Customer name"),
      select("channel", "Channel", channels),
      field("message", "Reminder message", "textarea"),
      field("due", "Due date & time", "datetime-local"),
      select("priority", "Priority", ["Warm", "Hot", "Cold"]),
      select("status", "Status", ["Scheduled", "Done", "Cancelled"]),
    ],
    note: "This is your team’s reminder planner. Scheduled reminders do not send automatically.",
  },
  broadcasts: {
    title: "A message worth opening.",
    description:
      "Prepare relevant campaigns for the customers who want to hear from you.",
    singular: "campaign",
    kind: "broadcasts",
    fields: [
      field("name", "Campaign name"),
      select("channel", "Channel", ["Messenger", "WhatsApp", "Instagram"]),
      select("audience", "Audience", [
        "All eligible",
        "Hot leads",
        "Warm leads",
        "Recent customers",
      ]),
      field("content", "Message", "textarea"),
      field("scheduled", "Planned date & time", "datetime-local", false),
      select("status", "Status", ["Draft", "Scheduled", "Cancelled"]),
    ],
    note: "Campaign planning is available. Bulk delivery is not connected; nothing is sent when you save or schedule a campaign.",
  },
  posts: {
    title: "Your next good story starts here.",
    description:
      "Organize your social content alongside the products you sell.",
    singular: "post",
    kind: "posts",
    fields: [
      field("name", "Post title"),
      select("platform", "Platform", ["Facebook", "Instagram"]),
      field("content", "Caption", "textarea"),
      field("scheduled", "Planned date & time", "datetime-local", false),
      select("status", "Status", ["Draft", "Scheduled", "Published"]),
    ],
    note: "Publishing status is tracked manually. Saving a post does not publish it to a social account.",
  },
  knowledge: {
    title: "Give your agent a little more wisdom.",
    description: "Policies, answers and brand guidelines, all in one place.",
    singular: "document",
    kind: "knowledge",
    fields: [
      field("name", "Document title"),
      select("type", "Type", ["Policy", "FAQ", "Product info", "Brand guide"]),
      field("content", "Content", "textarea"),
      select("status", "Status", ["Active", "Draft"]),
    ],
  },
  pages: {
    title: "Meet your customers where they are.",
    description: "Manage the channels that bring your business together.",
    singular: "channel",
    kind: "channels",
    fields: [
      field("name", "Channel name"),
      select("platform", "Platform", channels),
      field("externalId", "Page or account ID", "text", false),
      select("status", "Configuration", ["Not connected", "Sandbox"]),
      field("welcome", "Welcome message", "textarea", false),
    ],
    note: "Registering a channel saves its details. Live access requires platform credentials, app permissions and webhook configuration.",
  },
  team: {
    title: "A little teamwork goes a long way.",
    description: "Keep your team’s responsibilities organized.",
    singular: "teammate",
    kind: "team",
    fields: [
      field("name", "Name"),
      field("email", "Email", "email"),
      select("role", "Responsibility", ["Agent", "Admin", "Viewer"]),
      select("status", "Roster status", ["Roster only", "Inactive"]),
    ],
    note: "This is a team roster. Adding someone does not email them or grant access. Workspace sharing is managed separately by the site owner.",
  },
  bookings: {
    title: "A little time, well spent.",
    description: "Keep appointments organized and customers informed.",
    singular: "booking",
    kind: "bookings",
    fields: [
      field("name", "Customer name"),
      field("service", "Service"),
      field("date", "Date", "date"),
      field("time", "Time", "time"),
      select("status", "Status", [
        "Requested",
        "Confirmed",
        "Completed",
        "Cancelled",
      ]),
      field("notes", "Notes", "textarea", false),
    ],
  },
  automations: {
    title: "Design a smarter everyday workflow.",
    description: "Define the rules you want your assistant to follow.",
    singular: "automation rule",
    kind: "automations",
    fields: [
      field("name", "Rule name"),
      select("trigger", "Trigger", [
        "New conversation",
        "Customer question",
        "Order confirmed",
        "Order shipped",
        "Conversation waiting",
      ]),
      select("action", "Action", [
        "Suggest reply",
        "Notify team",
        "Create follow-up",
        "Request review",
      ]),
      { key: "enabled", label: "Rule enabled", type: "toggle", default: false },
      field("instructions", "Instructions", "textarea", false),
    ],
    note: "Rules are saved configurations. Background execution and automatic sending are not enabled in this release.",
  },
  feedback: {
    title: "Make the workspace better.",
    description:
      "Track ideas, issues and the improvements that matter to your team.",
    singular: "feedback item",
    kind: "feedback",
    fields: [
      field("name", "Title"),
      select("category", "Category", [
        "Feature request",
        "Bug report",
        "General",
      ]),
      field("content", "Details", "textarea"),
      select("status", "Status", ["Open", "Reviewed"]),
    ],
  },
};
export function defaults(module: Module): Payload {
  return Object.fromEntries(
    module.fields.map((f) => [
      f.key,
      f.default ??
        (f.type === "number"
          ? 0
          : f.type === "toggle"
            ? false
            : f.type === "select"
              ? f.options?.[0] || ""
              : ""),
    ]),
  );
}
export const navigation = [
  {
    group: "WORKSPACE",
    items: [
      ["overview", "Overview", "LayoutDashboard"],
      ["inbox", "Unified inbox", "Inbox"],
      ["notifications", "Notifications", "Bell"],
      ["leads", "Leads & customers", "UsersRound"],
      ["saved-replies", "Saved replies", "MessageSquareText"],
      ["orders", "Orders", "ShoppingBag"],
      ["activity", "Activity log", "Activity"],
      ["analytics", "Analytics", "ChartNoAxesCombined"],
    ],
  },
  {
    group: "GROW YOUR BUSINESS",
    items: [
      ["followups", "Follow-ups", "Clock3"],
      ["broadcasts", "Broadcasts", "Megaphone"],
      ["products", "Product catalog", "Package"],
      ["posts", "Social posts", "Images"],
      ["knowledge", "Knowledge base", "BookOpen"],
      ["website", "Website chat", "Globe"],
      ["agent-desk", "Agent desk", "Sparkles"],
      ["automations", "Automations", "Zap"],
      ["bookings", "Bookings", "CalendarDays"],
    ],
  },
  {
    group: "SETUP",
    items: [
      ["pages", "Channels", "Waypoints"],
      ["billing", "Billing & usage", "Wallet"],
      ["team", "Team", "UserRoundPlus"],
      ["setup", "Setup guide", "ListChecks"],
      ["feedback", "Feedback", "MessageCircle"],
      ["settings", "Settings", "Settings2"],
    ],
  },
];
