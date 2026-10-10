"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Kind, Payload, RecordItem, Snapshot } from "@/lib/models";
import { modules, navigation } from "@/lib/modules";
import { Badge, Button, Empty, Icon, initials, Modal } from "./ui";
import RecordForm from "./record-form";
import PasswordForm from "./password-form";
const RevenueChart = lazy(() => import("./revenue-chart"));
const allNav = navigation.flatMap((g) => g.items);
const stages = ["New", "Contacted", "Qualified", "Follow-up", "Won", "Lost"];
const labelFor = (id: string) =>
  allNav.find((n) => n[0] === id)?.[1] || "Overview";
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Dhaka",
  });
async function api<T>(url: string, method = "GET", data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const value = (await res.json()) as { error?: string };
  if (res.status === 401) location.href = "/login";
  if (!res.ok) throw new Error(value.error || "Request failed.");
  return value as T;
}
type ModalState =
  | { type: "record"; page: string; record?: RecordItem }
  | { type: "search" | "integrations" | "sample" }
  | { type: "delete"; record: RecordItem }
  | null;
export default function WorkspaceApp({ initialPage }: { initialPage: string }) {
  const [page, setPage] = useState(
    allNav.some((n) => n[0] === initialPage) ? initialPage : "overview",
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(7);
  const [selected, setSelected] = useState("");
  const [reply, setReply] = useState("");
  const [sendExternally, setSendExternally] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentReply, setAgentReply] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [deviceNotify, setDeviceNotify] = useState("default");
  const notify = useCallback((message: string) => setToast(message), []);
  const refresh = useCallback(async () => {
    try {
      const data = await api<Snapshot>("/api/workspace");
      setSnapshot(data);
      setError("");
      return data;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your workspace.",
      );
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
    const timer = setInterval(() => void refresh().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = snapshot?.workspace.darkMode
      ? "dark"
      : "light";
  }, [snapshot?.workspace.darkMode]);
  useEffect(() => {
    const pop = () => {
      const p = location.pathname.split("/")[2] || "overview";
      setPage(allNav.some((n) => n[0] === p) ? p : "overview");
      setQuery("");
      setFilter("All");
    };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch("");
        setModal({ type: "search" });
      }
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("keydown", key);
    if ("Notification" in window) setDeviceNotify(Notification.permission);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const go = (id: string) => {
    setPage(id);
    setQuery("");
    setFilter("All");
    setMobile(false);
    setModal(null);
    history.pushState(
      null,
      "",
      id === "overview" ? "/dashboard" : "/dashboard/" + id,
    );
    window.scrollTo(0, 0);
  };
  const records = useCallback(
    (kind: Kind) => snapshot?.records.filter((r) => r.kind === kind) || [],
    [snapshot],
  );
  const money = (n: unknown) =>
    (snapshot?.workspace.currency === "USD" ? "$" : "৳") +
    Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const filtered = (kind: Kind) =>
    records(kind).filter(
      (r) =>
        (!query ||
          Object.values(r.data).some((v) =>
            String(v).toLowerCase().includes(query.toLowerCase()),
          )) &&
        (filter === "All" ||
          r.data.status === filter ||
          r.data.stage === filter ||
          r.data.category === filter),
    );
  async function mutate(
    url: string,
    method: string,
    data?: unknown,
    message = "Saved to your workspace.",
  ) {
    setBusy(true);
    try {
      await api(url, method, data);
      await refresh();
      notify(message);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to save.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function update(record: RecordItem, changes: Payload) {
    await mutate(`/api/records/${record.kind}/${record.id}`, "PATCH", {
      data: { ...record.data, ...changes },
      version: record.version,
    });
  }
  async function saveRecord(
    modulePage: string,
    data: Payload,
    record?: RecordItem,
  ) {
    const m = modules[modulePage];
    await mutate(
      `/api/records/${m.kind}${record ? "/" + record.id : ""}`,
      record ? "PATCH" : "POST",
      record ? { data, version: record.version } : data,
    );
    setModal(null);
  }
  function create(modulePage = page) {
    setModal({ type: "record", page: modulePage });
  }
  const edit = (record: RecordItem) => {
    const modulePage = Object.keys(modules).find(
      (p) => modules[p].kind === record.kind,
    );
    if (modulePage) setModal({ type: "record", page: modulePage, record });
  };
  const handle = (fn: () => Promise<unknown>) => void fn().catch(() => {});
  const waiting = records("conversations").filter(
    (r) => r.data.status === "Waiting",
  );
  const relevantOrders = records("orders").filter(
    (r) => r.data.status !== "Cancelled",
  );
  const totalRevenue = relevantOrders.reduce(
    (n, r) => n + Number(r.data.amount),
    0,
  );
  const revenueData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: period }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - period + 1 + i);
      const day = date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
      const revenue = (snapshot?.records || [])
        .filter(
          (r) =>
            r.kind === "orders" &&
            r.data.status !== "Cancelled" &&
            new Date(r.createdAt).toLocaleDateString("en-CA", {
              timeZone: "Asia/Dhaka",
            }) === day,
        )
        .reduce((sum, r) => sum + Number(r.data.amount), 0);
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "Asia/Dhaka",
        }),
        revenue,
      };
    });
  }, [snapshot, period]);
  const pageHeader = (
    title: string,
    description: string,
    actions?: React.ReactNode,
    eyebrow = "YOUR WORKSPACE",
  ) => (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="head-buttons">{actions}</div>}
    </div>
  );
  const textLink = (text: string, destination: string) => (
    <button className="text-button" onClick={() => go(destination)}>
      {text}
      <Icon name="ArrowRight" size={14} />
    </button>
  );
  function metrics() {
    const data = [
      [
        "Total order value",
        money(totalRevenue),
        "Wallet",
        `${relevantOrders.length} orders · excludes cancellations`,
      ],
      [
        "Conversations",
        records("conversations").length,
        "MessageCircle",
        `${records("messages").length} messages in your workspace`,
      ],
      [
        "Waiting for your team",
        waiting.length,
        "UsersRound",
        "A little attention goes a long way",
      ],
      [
        "Open opportunities",
        records("leads").filter(
          (r) => !["Won", "Lost"].includes(String(r.data.stage)),
        ).length,
        "TrendingUp",
        money(
          records("leads")
            .filter((r) => !["Won", "Lost"].includes(String(r.data.stage)))
            .reduce((n, r) => n + Number(r.data.value), 0),
        ) + " pipeline value",
      ],
    ];
    return (
      <section className="metrics">
        {data.map(([title, value, ic, sub]) => (
          <article className="metric" key={String(title)}>
            <div className="metric-top">
              <span>{title}</span>
              <span className="metric-icon">
                <Icon name={String(ic)} size={16} />
              </span>
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-bottom">
              <span className="online-dot" />
              {sub}
            </div>
          </article>
        ))}
      </section>
    );
  }
  function chart() {
    const total = revenueData.reduce((n, r) => n + r.revenue, 0);
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Revenue overview</h2>
            <p className="panel-subtitle">
              Order value recorded in your workspace.
            </p>
          </div>
          <div className="segmented">
            {[7, 14, 30].map((p) => (
              <button
                key={p}
                className={period === p ? "active" : ""}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
        <div className="chart-summary">
          <strong className="chart-total">{money(total)}</strong>
          <span className="badge gray">Last {period} days</span>
        </div>
        <Suspense fallback={<div className="chart-container" />}>
          <RevenueChart
            data={revenueData}
            currency={snapshot?.workspace.currency === "USD" ? "$" : "৳"}
          />
        </Suspense>
        <div className="chart-foot">
          <Icon name="Lightbulb" size={13} />
          Keep your order statuses up to date for a clearer picture.
        </div>
      </section>
    );
  }
  function activityPanel() {
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Workspace activity</h2>
            <p className="panel-subtitle">The pulse of your business.</p>
          </div>
          <span className="badge green">
            <span className="online-dot" />
            Live records
          </span>
        </div>
        <div className="activity-list">
          {snapshot?.events.slice(0, 4).map((e) => (
            <div className="activity-item" key={e.id}>
              <span className="activity-icon">
                <Icon
                  name={
                    e.entityKind === "orders"
                      ? "ShoppingBag"
                      : e.entityKind === "messages"
                        ? "MessageCircle"
                        : "Check"
                  }
                  size={14}
                />
              </span>
              <div>
                <strong>{e.action}</strong>
                <p>
                  {dateLabel(e.createdAt)} ·{" "}
                  {new Date(e.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Dhaka",
                  })}
                </p>
              </div>
            </div>
          ))}
          {!snapshot?.events.length && (
            <Empty
              title="Quiet, in a good way."
              description="Workspace updates will appear as you get started."
            />
          )}
        </div>
        <div className="panel-foot">
          {textLink("View all activity", "activity")}
        </div>
      </section>
    );
  }
  function channelPanel() {
    const list = records("channels");
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Your channels</h2>
          {textLink("Manage", "pages")}
        </div>
        <div className="channel-list">
          {list.slice(0, 3).map((c) => (
            <div className="channel-item" key={c.id}>
              <span
                className={`channel-logo ${String(c.data.platform).toLowerCase()}`}
              >
                <Icon
                  name={
                    c.data.platform === "Website" ? "Globe" : "MessageCircle"
                  }
                  size={19}
                />
              </span>
              <div>
                <strong>{String(c.data.platform)}</strong>
                <small>{c.title}</small>
              </div>
              <Badge>{String(c.data.status)}</Badge>
            </div>
          ))}
          {!list.length && (
            <Empty
              title="Make your first connection."
              description="Register your website or social page."
            />
          )}
        </div>
        <div className="panel-foot">
          <button className="text-button" onClick={() => create("pages")}>
            <Icon name="Plus" size={14} />
            Add a channel
          </button>
        </div>
      </section>
    );
  }
  function table(list: RecordItem[], kind: Kind) {
    const cols: Record<string, string[]> = {
      orders: ["product", "channel", "amount", "status"],
      followups: ["channel", "due", "priority", "status"],
      broadcasts: ["channel", "audience", "status"],
      posts: ["platform", "scheduled", "status"],
      team: ["email", "role", "status"],
      bookings: ["service", "date", "time", "status"],
      feedback: ["category", "status"],
      leads: ["interest", "value", "stage"],
      channels: ["platform", "status"],
    };
    const fields = cols[kind] || ["status"];
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{kind === "orders" ? "Customer" : "Name"}</th>
              {fields.map((f) => (
                <th key={f}>
                  {f === "amount"
                    ? "Total"
                    : f.replace(/^./, (s) => s.toUpperCase())}
                </th>
              ))}
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="customer">
                    <span className="customer-avatar">{initials(r.title)}</span>
                    <span>
                      <button className="record-title" onClick={() => edit(r)}>
                        {r.title}
                      </button>
                      <small>{dateLabel(r.createdAt)}</small>
                    </span>
                  </div>
                </td>
                {fields.map((f) => (
                  <td key={f}>
                    {f === "status" || f === "stage" || f === "priority" ? (
                      <Badge>{String(r.data[f])}</Badge>
                    ) : f === "amount" || f === "value" ? (
                      <strong>{money(r.data[f])}</strong>
                    ) : f === "channel" || f === "platform" ? (
                      <span className="channel">
                        <span
                          className={`channel-dot ${String(r.data[f]).toLowerCase()}`}
                        >
                          {r.data[f] === "Instagram" ? "◎" : "ϟ"}
                        </span>
                        {String(r.data[f])}
                      </span>
                    ) : (
                      String(r.data[f] || "—")
                    )}
                  </td>
                ))}
                <td>
                  <div className="row-buttons">
                    <button
                      className="icon-button"
                      onClick={() => edit(r)}
                      aria-label={`Edit ${r.title}`}
                    >
                      <Icon name="ArrowUpRight" size={15} />
                    </button>
                    {kind !== "orders" && (
                      <button
                        className="icon-button delete-button"
                        onClick={() => setModal({ type: "delete", record: r })}
                        aria-label={`Delete ${r.title}`}
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <Empty
            title="Your next chapter starts here."
            description={`Add your first ${modules[Object.keys(modules).find((p) => modules[p].kind === kind) || "orders"]?.singular || "record"} to get started.`}
          />
        )}
      </div>
    );
  }
  function overview() {
    return (
      <>
        {pageHeader(
          `Hello, ${snapshot?.workspace.ownerName.split(" ")[0] || "there"} ☀`,
          "Here's what's happening with your business today.",
          <>
            <Button icon="CalendarDays" onClick={() => go("analytics")}>
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Dhaka",
              })}
            </Button>
            <Button primary icon="Plus" onClick={() => create("orders")}>
              Create order
            </Button>
          </>,
          new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "Asia/Dhaka",
            })
            .toUpperCase(),
        )}
        <section className="welcome-banner">
          <div className="banner-left">
            <span className="spark-box">
              <Icon name="Sparkles" size={25} />
            </span>
            <div>
              <h2>
                {snapshot?.sampleImported
                  ? "A little inspiration for your next big chapter."
                  : "A great day to bring your business together."}
              </h2>
              <p>
                {snapshot?.sampleImported
                  ? "You’re exploring sample records. Every change is saved to your workspace."
                  : "Your conversations, orders and opportunities. One thoughtful workspace."}
              </p>
            </div>
          </div>
          {textLink("See the bigger picture", "analytics")}
        </section>
        {metrics()}
        <div className="dashboard-grid">
          {chart()}
          {activityPanel()}
        </div>
        <div className="dashboard-grid">
          <section className="panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Recent orders</h2>
                <p className="panel-subtitle">
                  From conversation to conversion.
                </p>
              </div>
              {textLink("View all", "orders")}
            </div>
            {table(records("orders").slice(0, 5), "orders")}
          </section>
          <div className="stack-panels">
            {channelPanel()}
            <aside className="tip-panel">
              <h3>
                <Icon name="Lightbulb" size={15} />A little tip for a bigger
                business
              </h3>
              <p>
                Add your return policy to the knowledge base. Your agent can
                answer tricky questions with confidence.
              </p>
              {textLink("Improve your agent", "knowledge")}
            </aside>
          </div>
        </div>
      </>
    );
  }
  function inbox() {
    const list = filtered("conversations");
    const c = list.find((c) => c.id === selected) || list[0];
    const messages = c
      ? records("messages")
          .filter((m) => m.data.conversationId === c.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [];
    return (
      <>
        {pageHeader(
          modules.inbox.title,
          modules.inbox.description,
          <Button icon="Plus" onClick={() => create("inbox")}>
            Test conversation
          </Button>,
        )}
        <section className="panel inbox">
          <div className="conversation-list">
            <div className="inbox-search">
              <input
                className="field"
                placeholder="Find a conversation…"
                aria-label="Find a conversation"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="segmented inbox-filters">
                {["All", "Waiting", "Human", "Resolved"].map((v) => (
                  <button
                    key={v}
                    className={filter === v ? "active" : ""}
                    onClick={() => setFilter(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {list.map((x) => (
              <button
                key={x.id}
                className={`conversation ${c?.id === x.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(x.id);
                  setReply("");
                  setSendExternally(false);
                }}
              >
                <span className="customer-avatar">{initials(x.title)}</span>
                <div>
                  <strong>{x.title}</strong>
                  <p>{String(x.data.summary || "Start a conversation")}</p>
                  <small>
                    {String(x.data.channel)} · {String(x.data.status)}
                  </small>
                </div>
              </button>
            ))}
          </div>
          {c ? (
            <div className="chat">
              <div className="chat-head">
                <div>
                  <h3>{c.title}</h3>
                  <small>
                    {String(c.data.channel)} ·{" "}
                    <Badge>{String(c.data.status)}</Badge>
                  </small>
                </div>
                <div className="chat-actions">
                  <Button
                    disabled={busy}
                    icon="UserRound"
                    onClick={() =>
                      handle(() =>
                        update(c, {
                          status: c.data.status === "Human" ? "AI" : "Human",
                        }),
                      )
                    }
                  >
                    {c.data.status === "Human" ? "Return to AI" : "Take over"}
                  </Button>
                  <button
                    className="icon-button"
                    title="Resolve conversation"
                    onClick={() =>
                      handle(() => update(c, { status: "Resolved" }))
                    }
                  >
                    <Icon name="CheckCheck" />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Edit conversation"
                    onClick={() => edit(c)}
                  >
                    <Icon name="Pencil" size={15} />
                  </button>
                </div>
              </div>
              <div className="messages" key={c.id}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`message ${m.data.direction === "out" ? "out" : ""}`}
                  >
                    <p>{String(m.data.text)}</p>
                    <small>
                      {new Date(m.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Dhaka",
                      })}{" "}
                      · {String(m.data.delivery)}
                    </small>
                  </div>
                ))}
                {!messages.length && (
                  <Empty
                    title="A fresh conversation."
                    description="Write a reply to get started."
                  />
                )}
              </div>
              <div className="chat-compose">
                <div className="chat-tools">
                  <span>
                    {sendExternally
                      ? "Send to Messenger customer"
                      : "Replies are saved to your workspace"}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (!snapshot?.integrations.ai) {
                        setModal({ type: "integrations" });
                        return;
                      }
                      setAgentBusy(true);
                      void api<{ reply: string }>("/api/assistant", "POST", {
                        prompt: `Draft a reply to this conversation: ${messages.map((m) => m.data.text).join("\n")}`,
                      })
                        .then((r) => setReply(r.reply))
                        .catch((e) => notify(e.message))
                        .finally(() => setAgentBusy(false));
                    }}
                    disabled={agentBusy}
                  >
                    <Icon name="Sparkles" size={13} />
                    {agentBusy ? "Drafting…" : "AI draft"}
                  </button>
                </div>
                {records("replies").length > 0 && (
                  <select
                    className="select reply-templates"
                    value=""
                    aria-label="Insert saved reply"
                    onChange={(e) =>
                      setReply(
                        String(
                          records("replies").find(
                            (r) => r.id === e.target.value,
                          )?.data.content || "",
                        ),
                      )
                    }
                  >
                    <option value="">Insert a saved reply…</option>
                    {records("replies").map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                )}
                {snapshot?.integrations.messenger &&
                  c.data.channel === "Messenger" && (
                    <label className="send-toggle">
                      <input
                        type="checkbox"
                        checked={sendExternally}
                        onChange={(e) => setSendExternally(e.target.checked)}
                      />
                      Send this reply to the customer on Messenger
                    </label>
                  )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reply.trim()) return;
                    handle(async () => {
                      await mutate(
                        `/api/conversations/${c.id}/messages`,
                        "POST",
                        { text: reply, sendExternally },
                        sendExternally
                          ? "Message sent to Messenger."
                          : "Reply saved. No external message was sent.",
                      );
                      setReply("");
                    });
                  }}
                >
                  <input
                    className="field"
                    aria-label="Your reply"
                    placeholder="Write a thoughtful reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={4000}
                    required
                  />
                  <button
                    className="btn primary"
                    disabled={busy}
                    type="submit"
                    aria-label="Send reply"
                  >
                    <Icon name="Send" size={16} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <Empty
              title="Every great relationship starts with hello."
              description="Create a test conversation or configure an incoming channel."
              action={
                <Button onClick={() => create("inbox")} icon="Plus">
                  Create test conversation
                </Button>
              }
            />
          )}
        </section>
      </>
    );
  }
  function collection() {
    const m = modules[page];
    const list = filtered(m.kind);
    const statuses = [
      ...new Set(
        records(m.kind)
          .map((r) =>
            String(r.data.status || r.data.stage || r.data.category || ""),
          )
          .filter(Boolean),
      ),
    ];
    return (
      <>
        {pageHeader(
          m.title,
          m.description,
          <>
            <a className="btn" href={"/api/export?kind=" + m.kind}>
              <Icon name="Download" size={14} />
              Export CSV
            </a>
            <Button primary icon="Plus" onClick={() => create()}>
              Add {m.singular}
            </Button>
          </>,
        )}
        {m.note && (
          <div className="info-notice">
            <Icon name="Info" size={16} />
            {m.note}
          </div>
        )}
        <div className="toolbar">
          <div className="input-icon">
            <Icon name="Search" size={15} />
            <input
              className="field"
              placeholder={`Search ${labelFor(page).toLowerCase()}…`}
              aria-label="Search records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filters">
            <select
              className="select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter records"
            >
              <option>All</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="record-count">
              {list.length} {list.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>
        {page === "leads" ? (
          <div className="kanban">
            {stages.map((s) => (
              <section className="kanban-column" key={s}>
                <h3>
                  <span className={`stage-dot stage-${s.toLowerCase()}`} />
                  {s}
                  <span>{list.filter((r) => r.data.stage === s).length}</span>
                </h3>
                {list
                  .filter((r) => r.data.stage === s)
                  .map((r) => (
                    <article className="lead-card" key={r.id}>
                      <div className="lead-top">
                        <span className="customer-avatar">
                          {initials(r.title)}
                        </span>
                        <button
                          onClick={() => edit(r)}
                          aria-label={`Edit ${r.title}`}
                        >
                          <Icon name="Ellipsis" size={16} />
                        </button>
                      </div>
                      <button className="record-title" onClick={() => edit(r)}>
                        {r.title}
                      </button>
                      <p>{String(r.data.interest)}</p>
                      <div className="lead-value">
                        <strong>{money(r.data.value)}</strong>
                        <Badge>{String(r.data.priority)}</Badge>
                      </div>
                      <select
                        className="select"
                        value={String(r.data.stage)}
                        onChange={(e) =>
                          handle(() => update(r, { stage: e.target.value }))
                        }
                        aria-label={`Stage for ${r.title}`}
                        disabled={busy}
                      >
                        {stages.map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </article>
                  ))}
                {!list.some((r) => r.data.stage === s) && (
                  <p className="column-empty">
                    Room for your next opportunity.
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : [
            "products",
            "knowledge",
            "saved-replies",
            "automations",
            "pages",
          ].includes(page) ? (
          <div className="card-grid">
            {list.map((r) => (
              <article
                className={`panel entity-card ${page === "products" ? "product-card" : ""}`}
                key={r.id}
              >
                {page === "products" && (
                  <div
                    className={`product-art art-${String(r.data.category).toLowerCase()}`}
                  >
                    <Icon
                      name={
                        r.data.category === "Clothing"
                          ? "Shirt"
                          : r.data.category === "Accessories"
                            ? "ShoppingBag"
                            : "Package"
                      }
                      size={63}
                    />
                    <span>{String(r.data.category)}</span>
                  </div>
                )}
                <div className="entity-content">
                  <div className="entity-top">
                    {page !== "products" && (
                      <span className="feature-icon">
                        <Icon
                          name={
                            page === "knowledge"
                              ? "BookOpen"
                              : page === "saved-replies"
                                ? "MessageSquareText"
                                : page === "pages"
                                  ? "Waypoints"
                                  : "Zap"
                          }
                          size={22}
                        />
                      </span>
                    )}
                    {page === "automations" ? (
                      <button
                        className={`switch ${r.data.enabled ? "on" : ""}`}
                        role="switch"
                        aria-checked={!!r.data.enabled}
                        aria-label={`Enable ${r.title}`}
                        onClick={() =>
                          handle(() => update(r, { enabled: !r.data.enabled }))
                        }
                        disabled={busy}
                      />
                    ) : r.data.status ? (
                      <Badge>{String(r.data.status)}</Badge>
                    ) : (
                      <Badge>
                        {String(r.data.category || r.data.type || "Saved")}
                      </Badge>
                    )}
                  </div>
                  <h3>{r.title}</h3>
                  <p>
                    {String(
                      r.data.description ||
                        r.data.content ||
                        r.data.instructions ||
                        r.data.welcome ||
                        r.data.trigger ||
                        "Channel configuration",
                    )}
                  </p>
                  <div className="entity-meta">
                    {page === "products" ? (
                      <>
                        <span>
                          {String(r.data.sku)} · {String(r.data.stock)} in stock
                        </span>
                        <strong>{money(r.data.price)}</strong>
                      </>
                    ) : page === "saved-replies" ? (
                      <code>/{String(r.data.shortcut)}</code>
                    ) : page === "knowledge" ? (
                      <span>
                        {String(r.data.type)} ·{" "}
                        {String(r.data.content).split(/\s+/).length} words
                      </span>
                    ) : page === "pages" ? (
                      <span>
                        {String(r.data.platform)} ·{" "}
                        {String(r.data.externalId || "No platform ID")}
                      </span>
                    ) : (
                      <span>{String(r.data.action)}</span>
                    )}
                  </div>
                  <div className="entity-actions">
                    <button className="text-button" onClick={() => edit(r)}>
                      Edit <Icon name="ArrowRight" size={14} />
                    </button>
                    {page === "saved-replies" && (
                      <button
                        className="text-button"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(String(r.data.content))
                            .then(() => notify("Reply copied."))
                            .catch(() =>
                              notify(
                                "Copy is unavailable. Select and copy the reply text.",
                              ),
                            )
                        }
                      >
                        Copy <Icon name="Copy" size={13} />
                      </button>
                    )}
                    <button
                      className="icon-button"
                      onClick={() => setModal({ type: "delete", record: r })}
                      aria-label={`Delete ${r.title}`}
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!list.length && (
              <section className="panel full-width">
                <Empty
                  title="A little organization starts here."
                  description={`Add your first ${m.singular}, and make it your own.`}
                  action={
                    <Button icon="Plus" onClick={() => create()}>
                      Add {m.singular}
                    </Button>
                  }
                />
              </section>
            )}
          </div>
        ) : (
          <section className="panel">{table(list, m.kind)}</section>
        )}
        {page === "pages" && (
          <div className="integration-box panel">
            <h3>Ready for a real connection?</h3>
            <p>
              Review the services needed to receive messages and enable AI
              drafts.
            </p>
            <Button
              icon="Plug"
              onClick={() => setModal({ type: "integrations" })}
            >
              Integration setup
            </Button>
          </div>
        )}
      </>
    );
  }
  function notifications() {
    return (
      <>
        {pageHeader(
          "A little attention goes a long way.",
          "A clear queue for every customer who needs a person.",
        )}
        <div className="notification-stats">
          <article className="panel mini-stat">
            <span>WAITING FOR THE TEAM</span>
            <strong>{waiting.length}</strong>
            <small>Conversations requesting help</small>
          </article>
          <article className="panel mini-stat">
            <span>WITH A PERSON</span>
            <strong>
              {
                records("conversations").filter(
                  (c) => c.data.status === "Human",
                ).length
              }
            </strong>
            <small>Currently being handled</small>
          </article>
          <article className="panel mini-stat">
            <span>RESOLVED</span>
            <strong>
              {
                records("conversations").filter(
                  (c) => c.data.status === "Resolved",
                ).length
              }
            </strong>
            <small>Customers taken care of</small>
          </article>
        </div>
        <section className="panel">
          <div className="panel-head">
            <h2>Needs attention</h2>
            <Badge>{waiting.length + " waiting"}</Badge>
          </div>
          <div className="notification-list">
            {waiting.map((c) => (
              <div className="notification-row" key={c.id}>
                <span className="activity-icon orange">
                  <Icon name="MessageCircle" size={17} />
                </span>
                <div>
                  <h3>{c.title} needs your help</h3>
                  <p>{String(c.data.summary || c.data.channel)}</p>
                </div>
                <Button
                  onClick={() => {
                    setSelected(c.id);
                    go("inbox");
                  }}
                >
                  Open conversation
                </Button>
                <Button
                  icon="Check"
                  disabled={busy}
                  onClick={() =>
                    handle(() => update(c, { status: "Resolved" }))
                  }
                >
                  Resolve
                </Button>
              </div>
            ))}
            {!waiting.length && (
              <Empty
                title="You’re all caught up."
                description="Every waiting conversation has been taken care of."
              />
            )}
          </div>
        </section>
      </>
    );
  }
  function activity() {
    return (
      <>
        {pageHeader(
          "The story behind every change.",
          "A persistent audit trail for your workspace.",
        )}
        <div className="toolbar">
          <input
            className="field"
            placeholder="Search activity…"
            aria-label="Search activity"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="record-count">Latest 100 events</span>
        </div>
        <section className="panel activity-page">
          {snapshot?.events
            .filter((e) => e.action.toLowerCase().includes(query.toLowerCase()))
            .map((e) => (
              <div className="activity-item" key={e.id}>
                <span className="activity-icon">
                  <Icon name="Activity" size={16} />
                </span>
                <div>
                  <strong>{e.action}</strong>
                  <p>
                    {e.entityKind} ·{" "}
                    {new Date(e.createdAt).toLocaleString("en-US", {
                      timeZone: "Asia/Dhaka",
                    })}
                  </p>
                </div>
                <Badge>Saved</Badge>
              </div>
            ))}
          {!snapshot?.events.length && (
            <Empty
              title="Your story starts here."
              description="Create a record to see your first activity event."
            />
          )}
        </section>
      </>
    );
  }
  function analytics() {
    const conv = records("conversations");
    return (
      <>
        {pageHeader(
          "The bigger picture, made simple.",
          "Insights calculated from the records in your workspace.",
          <a className="btn" href="/api/export?kind=orders">
            <Icon name="Download" size={14} />
            Export orders
          </a>,
        )}
        {metrics()}
        <div className="analytics-grid">
          {chart()}
          <section className="panel breakdown">
            <h2>Conversations by channel</h2>
            {["Website", "Messenger", "WhatsApp", "Instagram"].map((c) => {
              const n = conv.filter((r) => r.data.channel === c).length;
              const pct = conv.length ? Math.round((n / conv.length) * 100) : 0;
              return (
                <div className="bar-row" key={c}>
                  <div className="bar-label">
                    <span>{c}</span>
                    <strong>
                      {n} · {pct}%
                    </strong>
                  </div>
                  <div className="bar-track">
                    <span style={{ width: pct + "%" }} />
                  </div>
                </div>
              );
            })}
            <p className="insight">
              These figures reflect saved records. Connected channels can add
              live incoming messages once configured.
            </p>
          </section>
        </div>
        <div className="card-grid">
          {[
            [
              "Incoming messages",
              records("messages").filter((m) => m.data.direction === "in")
                .length,
              "Inbox",
            ],
            [
              "Outgoing replies",
              records("messages").filter((m) => m.data.direction === "out")
                .length,
              "Send",
            ],
            [
              "AI draft requests",
              snapshot?.events.filter((e) => e.entityKind === "ai").length || 0,
              "Sparkles",
            ],
          ].map(([title, n, ic]) => (
            <article key={String(title)} className="panel mini-stat">
              <span className="feature-icon">
                <Icon name={String(ic)} size={22} />
              </span>
              <strong>{n}</strong>
              <small>{title}</small>
            </article>
          ))}
        </div>
      </>
    );
  }
  function setup() {
    const steps = [
      {
        title: "Make the workspace yours",
        description: "Set your business name and preferred currency.",
        done: snapshot?.workspace.name !== "My business",
        page: "settings",
        icon: "Store",
      },
      {
        title: "Build your product catalog",
        description: "Add verified prices, stock and product details.",
        done: records("products").length > 0,
        page: "products",
        icon: "Package",
      },
      {
        title: "Give your agent knowledge",
        description: "Add policies, common questions and brand guidance.",
        done: records("knowledge").length > 0,
        page: "knowledge",
        icon: "BookOpen",
      },
      {
        title: "Register your channels",
        description: "Bring your website and social accounts into view.",
        done: records("channels").length > 0,
        page: "pages",
        icon: "Waypoints",
      },
      {
        title: "Create your first saved reply",
        description: "Keep helpful answers at your fingertips.",
        done: records("replies").length > 0,
        page: "saved-replies",
        icon: "MessageSquareText",
      },
      {
        title: "Connect an AI provider",
        description: "Enable real drafts using your verified knowledge.",
        done: !!snapshot?.integrations.ai,
        page: "agent-desk",
        icon: "Sparkles",
      },
    ];
    return (
      <>
        {pageHeader(
          "A good beginning makes all the difference.",
          "Six thoughtful steps to get your workspace ready.",
        )}
        <section className="panel setup-progress">
          <div>
            <strong>
              {steps.filter((s) => s.done).length} of {steps.length} complete
            </strong>
            <span>Take it one step at a time.</span>
          </div>
          <div className="bar-track">
            <span
              style={{
                width:
                  (steps.filter((s) => s.done).length / steps.length) * 100 +
                  "%",
              }}
            />
          </div>
        </section>
        <div className="setup-steps">
          {steps.map((s, i) => (
            <button
              className={`panel setup-step ${s.done ? "done" : ""}`}
              onClick={() => go(s.page)}
              key={s.title}
            >
              <span className="step-number">
                {s.done ? <Icon name="Check" size={19} /> : i + 1}
              </span>
              <span>
                <strong>{s.title}</strong>
                <small>{s.description}</small>
              </span>
              <Icon name="ArrowRight" size={17} />
            </button>
          ))}
        </div>
        {snapshot?.records.length === 0 && (
          <aside className="sample-callout">
            <div>
              <h3>Want to look around first?</h3>
              <p>
                Load a sample commerce workspace and explore the full
                experience.
              </p>
            </div>
            <Button
              icon="Sparkles"
              onClick={() => setModal({ type: "sample" })}
            >
              Load sample data
            </Button>
          </aside>
        )}
      </>
    );
  }
  function agentDesk() {
    return (
      <>
        {pageHeader(
          "Your assistant, with your point of view.",
          "Test thoughtful AI replies before a customer ever sees them.",
          <Button
            icon="Settings2"
            onClick={() => setModal({ type: "integrations" })}
          >
            Provider setup
          </Button>,
        )}
        <div className="agent-layout">
          <section className="panel agent-test">
            <div className="panel-head">
              <div>
                <h2>Try a customer question</h2>
                <p className="panel-subtitle">
                  Replies use active knowledge documents and products.
                </p>
              </div>
              <Badge color={snapshot?.integrations.ai ? "green" : "gray"}>
                {snapshot?.integrations.ai
                  ? "AI configured"
                  : "AI not connected"}
              </Badge>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAgentBusy(true);
                setAgentReply("");
                void api<{ reply: string }>("/api/assistant", "POST", {
                  prompt: agentPrompt,
                })
                  .then((r) => {
                    setAgentReply(r.reply);
                    void refresh().catch(() => {});
                  })
                  .catch((e) => notify(e.message))
                  .finally(() => setAgentBusy(false));
              }}
            >
              <label>
                Customer message
                <textarea
                  className="field"
                  rows={5}
                  required
                  maxLength={4000}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="What is your return policy?"
                />
              </label>
              <Button
                primary
                type="submit"
                disabled={agentBusy || !snapshot?.integrations.ai}
                icon="Sparkles"
              >
                {agentBusy ? "Thinking…" : "Generate a draft"}
              </Button>
            </form>
            {!snapshot?.integrations.ai && (
              <div className="info-notice">
                Connect an AI provider to test real responses. No simulated
                answer is shown as AI.
              </div>
            )}
            {agentReply && (
              <div className="agent-answer">
                <div>
                  <Icon name="Sparkles" size={17} />
                  <strong>Draft for your review</strong>
                </div>
                <p>{agentReply}</p>
                <Button
                  icon="Copy"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(agentReply)
                      .then(() => notify("Draft copied."))
                      .catch(() => notify("Copy is unavailable."))
                  }
                >
                  Copy draft
                </Button>
              </div>
            )}
          </section>
          <div className="stack-panels">
            <section className="panel guidance-card">
              <span className="feature-icon">
                <Icon name="BookOpen" size={23} />
              </span>
              <h3>Good answers start with good knowledge.</h3>
              <p>
                {
                  records("knowledge").filter((r) => r.data.status === "Active")
                    .length
                }{" "}
                active documents ·{" "}
                {
                  records("products").filter((r) => r.data.status === "Active")
                    .length
                }{" "}
                active products
              </p>
              {textLink("Manage your knowledge", "knowledge")}
            </section>
            <section className="tip-panel">
              <h3>
                <Icon name="ShieldCheck" size={16} />
                Always a human in the loop
              </h3>
              <p>
                AI replies are drafts. Review them before sharing. The assistant
                is instructed to ask your team when information is missing.
              </p>
            </section>
          </div>
        </div>
      </>
    );
  }
  function website() {
    return (
      <>
        {pageHeader(
          "Make your website a little more welcoming.",
          "Preview a simple customer chat experience and manage its channel.",
        )}
        <div className="website-layout">
          <section className="panel settings-section">
            <h2>Your website channel</h2>
            <p>Keep the welcome message and website identity organized.</p>
            {records("channels")
              .filter((c) => c.data.platform === "Website")
              .map((c) => (
                <div className="settings-row" key={c.id}>
                  <div>
                    <strong>{c.title}</strong>
                    <p>{String(c.data.welcome || "Welcome message not set")}</p>
                  </div>
                  <Button onClick={() => edit(c)}>Edit</Button>
                </div>
              ))}
            <div className="form-actions">
              <Button primary icon="Plus" onClick={() => create("pages")}>
                Add website channel
              </Button>
            </div>
            <div className="info-notice" style={{ marginTop: 24 }}>
              This private workspace provides an authenticated chat preview. A
              public visitor widget, domain allowlist and visitor authentication
              are not deployed.
            </div>
          </section>
          <section className="widget-preview panel">
            <div className="widget-header">
              <span className="widget-brand">a✳</span>
              <div>
                <strong>{snapshot?.workspace.name}</strong>
                <small>We’re here to help.</small>
              </div>
              <Icon name="MessageCircle" size={22} />
            </div>
            <div className="widget-body">
              <span className="badge gray">Design preview</span>
              <div className="widget-message">
                {String(
                  records("channels").find((c) => c.data.platform === "Website")
                    ?.data.welcome ||
                    "Hi there! Welcome to our shop. How can we help you today?",
                )}
              </div>
              <div className="widget-note">
                <Icon name="ShieldCheck" size={13} />
                Your real customer inbox is one click away.
              </div>
            </div>
            <div className="widget-footer">
              <Button icon="ArrowRight" onClick={() => go("inbox")}>
                Open workspace inbox
              </Button>
            </div>
          </section>
        </div>
      </>
    );
  }
  function billing() {
    return (
      <>
        {pageHeader(
          "Clear usage. No surprises.",
          "Understand which services are connected and where billing happens.",
        )}
        <div className="notification-stats">
          <article className="panel mini-stat">
            <span>WORKSPACE RECORDS</span>
            <strong>{snapshot?.records.length || 0}</strong>
            <small>Stored in Cloudflare D1</small>
          </article>
          <article className="panel mini-stat">
            <span>AI REQUESTS IN RECENT ACTIVITY</span>
            <strong>
              {snapshot?.events.filter((e) => e.entityKind === "ai").length ||
                0}
            </strong>
            <small>Includes unsuccessful draft requests</small>
          </article>
          <article className="panel mini-stat">
            <span>EXTERNAL REPLIES RECORDED</span>
            <strong>
              {
                records("messages").filter((m) => m.data.delivery === "Sent")
                  .length
              }
            </strong>
            <small>Delivered through configured Messenger API</small>
          </article>
        </div>
        <section className="panel settings-section">
          <h2>Service billing</h2>
          <p>
            No subscription checkout or credit wallet is connected to this
            application.
          </p>
          <div className="settings-row">
            <div>
              <strong>Anthropic AI</strong>
              <p>Usage and billing are managed in your provider account.</p>
            </div>
            <Badge>
              {snapshot?.integrations.ai ? "Configured" : "Not connected"}
            </Badge>
          </div>
          <div className="settings-row">
            <div>
              <strong>Meta messaging</strong>
              <p>Platform permissions and messaging limits apply.</p>
            </div>
            <Badge>
              {snapshot?.integrations.messenger
                ? "Configured"
                : "Not connected"}
            </Badge>
          </div>
          <div className="form-actions">
            <Button
              icon="Plug"
              onClick={() => setModal({ type: "integrations" })}
            >
              Review integrations
            </Button>
          </div>
        </section>
      </>
    );
  }
  function settings() {
    const w = snapshot!.workspace;
    return (
      <>
        {pageHeader(
          "Make yourself at home.",
          "Your business, your preferences, your workspace.",
        )}
        <div className="settings-layout">
          <section className="panel settings-section">
            <h2>Workspace details</h2>
            <p>A few details to make the workspace yours.</p>
            <form
              key={w.id + w.name + w.ownerName}
              onSubmit={(e) => {
                e.preventDefault();
                const v = Object.fromEntries(new FormData(e.currentTarget));
                handle(() => mutate("/api/workspace", "PATCH", { ...w, ...v }));
              }}
            >
              <div className="form-grid">
                <label className="wide">
                  Business name
                  <input
                    className="field"
                    name="name"
                    defaultValue={w.name}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Your display name
                  <input
                    className="field"
                    name="ownerName"
                    defaultValue={w.ownerName}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Display currency
                  <select
                    className="select"
                    name="currency"
                    defaultValue={w.currency}
                  >
                    <option value="BDT">Bangladeshi taka (BDT)</option>
                    <option value="USD">US dollar (USD)</option>
                  </select>
                </label>
                <label>
                  Reply language preference
                  <select
                    className="select"
                    name="language"
                    defaultValue={w.language}
                  >
                    {["English", "বাংলা", "Auto-detect"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Signed-in account
                  <input
                    className="field"
                    value={snapshot!.user.email}
                    readOnly
                  />
                </label>
              </div>
              <div className="form-actions">
                <Button primary type="submit" disabled={busy}>
                  Save changes
                </Button>
              </div>
              <p className="muted-note">
                Currency changes the display symbol. Values are not converted
                between currencies.
              </p>
            </form>
          </section>
          <section className="panel settings-section">
            <h2>Workspace preferences</h2>
            <p>Make the space fit your day.</p>
            {[
              ["darkMode", "Dark appearance", "A calmer view for evenings."],
              [
                "agentEnabled",
                "Agent preference",
                "Save your desired agent availability. This does not start background automation.",
              ],
            ].map(([key, title, description]) => (
              <div className="settings-row" key={key}>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
                <button
                  className={`switch ${w[key as "darkMode" | "agentEnabled"] ? "on" : ""}`}
                  role="switch"
                  aria-checked={w[key as "darkMode" | "agentEnabled"]}
                  aria-label={title}
                  disabled={busy}
                  onClick={() =>
                    handle(() =>
                      mutate("/api/workspace", "PATCH", {
                        ...w,
                        [key]: !w[key as "darkMode" | "agentEnabled"],
                      }),
                    )
                  }
                />
              </div>
            ))}
            <div className="integration-box">
              <h3>Your account</h3>
              <p>
                Your account uses a secure server session. Records are scoped to
                your signed-in account.
              </p>
              <button
                className="text-button"
                onClick={() =>
                  handle(async () => {
                    await api("/api/auth/logout", "POST", {});
                    location.href = "/login";
                  })
                }
              >
                Sign out <Icon name="LogOut" size={14} />
              </button>
            </div>
            <PasswordForm />
            <div className="settings-row">
              <div>
                <strong>Notifications on this device</strong>
                <p>
                  Permission: {deviceNotify}. Background push is not configured.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (!("Notification" in window)) {
                    notify("This browser does not support notifications.");
                    return;
                  }
                  void Notification.requestPermission().then((p) => {
                    setDeviceNotify(p);
                    notify(`Notification permission: ${p}`);
                  });
                }}
              >
                Set permission
              </Button>
            </div>
          </section>
        </div>
      </>
    );
  }
  function integrationContent() {
    return (
      <>
        <p className="modal-note">
          Credentials belong in server-side environment variables. This app
          never asks you to paste secrets into a browser form.
        </p>
        <div className="integration-detail">
          <h3>
            <Icon name="Sparkles" size={19} />
            AI draft assistant
            <Badge>
              {snapshot?.integrations.ai ? "Configured" : "Not connected"}
            </Badge>
          </h3>
          <p>
            Set <code>ANTHROPIC_API_KEY</code> and <code>ANTHROPIC_MODEL</code>{" "}
            to enable reviewed drafts using your knowledge base.
          </p>
        </div>
        <div className="integration-detail">
          <h3>
            <Icon name="MessageCircle" size={19} />
            Messenger
            <Badge>
              {snapshot?.integrations.messenger
                ? "Configured"
                : "Not connected"}
            </Badge>
          </h3>
          <p>
            Set <code>META_APP_SECRET</code>, <code>META_VERIFY_TOKEN</code>,{" "}
            <code>META_PAGE_ACCESS_TOKEN</code>, <code>META_PAGE_ID</code>,{" "}
            <code>META_GRAPH_VERSION</code>, and <code>META_WORKSPACE_ID</code>.
          </p>
          <p>
            Workspace ID: <code>{snapshot?.workspace.id}</code>
          </p>
          <p>
            Webhook path: <code>/api/webhooks/meta</code>. Meta needs a publicly
            reachable webhook and approved page permissions. This workspace
            remains private.
          </p>
        </div>
        <p className="modal-note">
          WhatsApp, Instagram delivery, couriers, billing, public visitor chat
          and background jobs are not connected. Registered channel records are
          configuration entries.
        </p>
        <Button
          onClick={() => {
            setModal(null);
            go("setup");
          }}
          icon="ListChecks"
        >
          Open setup guide
        </Button>
      </>
    );
  }
  const searchResults = [
    ...allNav.map(([id, label, ic]) => ({
      id,
      label,
      sub: "Workspace page",
      ic,
      record: undefined as RecordItem | undefined,
    })),
    ...(snapshot?.records || [])
      .filter((r) => r.kind !== "messages")
      .map((r) => ({
        id:
          Object.keys(modules).find((p) => modules[p].kind === r.kind) ||
          "overview",
        label: r.title,
        sub: r.kind,
        ic: "FileText",
        record: r,
      })),
  ]
    .filter((r) =>
      (r.label + " " + r.sub).toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 10);
  return (
    <>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand"
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <span className="brandmark">
            a<span>✳</span>
          </span>
          AI Perks<span className="brand-dot">®</span>
        </a>
        <button className="workspace" onClick={() => go("settings")}>
          <span className="workspace-icon">
            {snapshot?.workspace.name[0] || "S"}
          </span>
          <span>
            <strong>{snapshot?.workspace.name || "Your workspace"}</strong>
            <small>Business workspace</small>
          </span>
          <Icon name="ChevronsUpDown" size={13} />
        </button>
        <nav className="sidebar-nav">
          {navigation.map((g) => (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map(([id, label, ic]) => (
                <a
                  key={id}
                  className={`nav-item ${page === id ? "active" : ""}`}
                  href={id === "overview" ? "/dashboard" : "/dashboard/" + id}
                  aria-current={page === id ? "page" : undefined}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      go(id);
                    }
                  }}
                >
                  <Icon name={ic} size={17} />
                  <span>{label}</span>
                  {id === "inbox" && waiting.length > 0 && (
                    <span className="count">{waiting.length}</span>
                  )}
                  {id === "agent-desk" && <span className="new">AI</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {snapshot?.user.role === "superadmin" && (
            <a className="admin-back" href="/admin">
              <Icon name="ShieldCheck" size={14} />
              Super-admin console
              <Icon name="ArrowUpRight" size={13} />
            </a>
          )}
          <button className="agent-status" onClick={() => go("agent-desk")}>
            <span
              className={`online-dot ${snapshot?.integrations.ai ? "" : "offline"}`}
            />
            <span>
              {snapshot?.integrations.ai
                ? "AI provider configured"
                : "Connect your AI assistant"}
            </span>
            <Icon name="ArrowUpRight" size={13} />
          </button>
          <button className="profile" onClick={() => go("settings")}>
            <span className="avatar">
              {initials(snapshot?.workspace.ownerName || "Business Owner")}
            </span>
            <span>
              <strong>
                {snapshot?.workspace.ownerName || "Business owner"}
              </strong>
              <small>Workspace owner</small>
            </span>
            <Icon name="ChevronsUpDown" size={13} />
          </button>
        </div>
      </aside>
      <div
        className={`scrim ${mobile ? "open" : ""}`}
        onClick={() => setMobile(false)}
      />
      <div className="shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Icon name="Menu" />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{labelFor(page)}</strong>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setSearch("");
                setModal({ type: "search" });
              }}
            >
              <Icon name="Search" size={15} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="demo-badge">
              {snapshot?.sampleImported ? "Sample records" : "Your workspace"}
            </span>
            <button
              className={`icon-button ${waiting.length ? "notification" : ""}`}
              onClick={() => go("notifications")}
              aria-label="View notifications"
            >
              <Icon name="Bell" size={18} />
            </button>
            <button
              className="top-avatar"
              onClick={() => go("settings")}
              aria-label="Account settings"
            >
              {initials(snapshot?.workspace.ownerName || "BO")}
            </button>
          </div>
        </header>
        <main>
          {loading ? (
            <div className="loading-state">
              <span className="spinner" />
              <h2>Getting your workspace ready…</h2>
              <p>A little organization is on its way.</p>
            </div>
          ) : error ? (
            <section className="panel">
              <Empty
                title="We couldn’t load your workspace."
                description={error}
                action={
                  <Button onClick={() => void refresh().catch(() => {})}>
                    Try again
                  </Button>
                }
              />
            </section>
          ) : snapshot ? (
            <>
              {page === "overview"
                ? overview()
                : page === "inbox"
                  ? inbox()
                  : page === "notifications"
                    ? notifications()
                    : page === "activity"
                      ? activity()
                      : page === "analytics"
                        ? analytics()
                        : page === "setup"
                          ? setup()
                          : page === "agent-desk"
                            ? agentDesk()
                            : page === "website"
                              ? website()
                              : page === "billing"
                                ? billing()
                                : page === "settings"
                                  ? settings()
                                  : modules[page]
                                    ? collection()
                                    : overview()}
            </>
          ) : null}
        </main>
        <footer>
          <span>
            <span className={`online-dot ${error ? "offline" : ""}`} />
            {error
              ? "Workspace unavailable"
              : "Changes saved to your workspace"}
          </span>
          <span>Made for a little less busy, and a lot more business.</span>
          <span>AI Perks © 2026</span>
        </footer>
      </div>
      {modal?.type === "record" && (
        <Modal
          title={`${modal.record ? "Edit" : "New"} ${modules[modal.page].singular}`}
          onClose={() => setModal(null)}
        >
          <RecordForm
            module={modules[modal.page]}
            record={modal.record}
            onSave={(data) => saveRecord(modal.page, data, modal.record)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "delete" && (
        <Modal
          title={`Delete ${modal.record.title}?`}
          onClose={() => setModal(null)}
        >
          <p className="modal-note">
            This removes the record from your workspace. Its activity history
            will remain.
          </p>
          <div className="form-actions">
            <Button onClick={() => setModal(null)}>Keep record</Button>
            <Button
              className="danger"
              disabled={busy}
              onClick={() =>
                handle(async () => {
                  await mutate(
                    `/api/records/${modal.record.kind}/${modal.record.id}`,
                    "DELETE",
                    { version: modal.record.version },
                    "Record deleted.",
                  );
                  setModal(null);
                })
              }
            >
              Delete record
            </Button>
          </div>
        </Modal>
      )}
      {modal?.type === "integrations" && (
        <Modal
          title="Bring your services together."
          onClose={() => setModal(null)}
        >
          {integrationContent()}
        </Modal>
      )}
      {modal?.type === "search" && (
        <Modal title="Find your next step." onClose={() => setModal(null)}>
          <input
            className="field global-search-input"
            autoFocus
            aria-label="Search workspace"
            placeholder="Search pages, customers, products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="search-results">
            {searchResults.map((r, i) => (
              <button
                className="search-result"
                key={r.id + i}
                onClick={() => {
                  go(r.id);
                  if (r.record) edit(r.record);
                }}
              >
                <Icon name={r.ic} />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.sub}</small>
                </span>
                <Icon name="ArrowUpRight" size={14} />
              </button>
            ))}
            {!searchResults.length && (
              <Empty
                title="Nothing found, just yet."
                description="Try a customer name, product or page."
              />
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "sample" && (
        <Modal
          title="Explore a little possibility."
          onClose={() => setModal(null)}
        >
          <p className="modal-note">
            Load sample products, customers, orders and conversations into this
            empty workspace. They are examples, and no real messages will be
            sent. All changes are stored in your workspace database.
          </p>
          <div className="form-actions">
            <Button onClick={() => setModal(null)}>Keep it empty</Button>
            <Button
              primary
              disabled={busy}
              icon="Sparkles"
              onClick={() =>
                handle(async () => {
                  await mutate(
                    "/api/sample",
                    "POST",
                    {},
                    "Sample workspace loaded.",
                  );
                  go("overview");
                })
              }
            >
              {busy ? "Loading…" : "Load sample workspace"}
            </Button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast visible" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
