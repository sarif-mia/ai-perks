"use client";
import { useEffect, useState } from "react";
import { Badge, Button, Icon, Modal, initials } from "./ui";
type Company = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  suspended: number;
  sampleImported: number;
  records: number;
  createdAt: string;
};
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};
type Data = {
  companies: Company[];
  users: User[];
  user: { name: string; email: string };
};
export default function AdminApp() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("companies"),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/admin");
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw new Error(d.error || "Unable to load.");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(url: string, method: string, payload: unknown) {
    setBusy(true);
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error || "Request failed.");
      await load();
      return d;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="brand">
          <span className="brandmark">
            a<span>✳</span>
          </span>
          AI Perks
        </a>
        <div className="admin-label">PLATFORM ADMINISTRATION</div>
        {[
          ["companies", "Companies", "Building2"],
          ["users", "Accounts", "UsersRound"],
        ].map(([id, t, ic]) => (
          <button
            className={`nav-item ${tab === id ? "active" : ""}`}
            key={id}
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
          >
            <Icon name={ic} />
            {t}
          </button>
        ))}
        <div className="admin-sidebar-foot">
          <a
            href="/dashboard"
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              void action("/api/admin/switch", "POST", { id: "" })
                .then(() => (location.href = "/dashboard"))
                .catch((e) => setError(e.message));
            }}
          >
            <Icon name="LayoutDashboard" />
            My workspace
          </a>
          <button
            className="nav-item"
            onClick={() =>
              void action("/api/auth/logout", "POST", {})
                .then(() => (location.href = "/login"))
                .catch((e) => setError(e.message))
            }
          >
            <Icon name="LogOut" />
            Sign out
          </button>
          <div className="admin-owner">
            <span className="avatar">
              {initials(data?.user.name || "Admin")}
            </span>
            <div>
              <strong>{data?.user.name || "Super admin"}</strong>
              <small>Super administrator</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <span>
            <Icon name="ShieldCheck" size={16} />
            Super-admin console
          </span>
          <span className="badge green">Platform access</span>
        </header>
        <main>
          <div className="page-head">
            <div>
              <div className="eyebrow">YOUR PLATFORM, AT A GLANCE</div>
              <h1>A good foundation for every business.</h1>
              <p>Manage companies and accounts from one secure control room.</p>
            </div>
            <Button
              primary
              icon="Plus"
              onClick={() => {
                setFormError("");
                setOpen(true);
              }}
            >
              Create company
            </Button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <section className="metrics admin-metrics">
            {[
              ["Companies", data?.companies.length || 0, "Building2"],
              [
                "Active workspaces",
                data?.companies.filter((c) => !c.suspended).length || 0,
                "Check",
              ],
              ["User accounts", data?.users.length || 0, "UsersRound"],
              [
                "Demo companies",
                data?.companies.filter((c) => c.sampleImported).length || 0,
                "Sparkles",
              ],
            ].map(([label, n, ic]) => (
              <article className="metric" key={String(label)}>
                <div className="metric-top">
                  <span>{label}</span>
                  <span className="metric-icon">
                    <Icon name={String(ic)} />
                  </span>
                </div>
                <div className="metric-value">{n}</div>
                <div className="metric-bottom">Live platform records</div>
              </article>
            ))}
          </section>
          <div className="toolbar">
            <div className="segmented">
              <button
                className={tab === "companies" ? "active" : ""}
                onClick={() => setTab("companies")}
              >
                Companies
              </button>
              <button
                className={tab === "users" ? "active" : ""}
                onClick={() => setTab("users")}
              >
                Accounts
              </button>
            </div>
            <input
              className="field"
              placeholder={`Search ${tab}…`}
              aria-label="Search platform"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(tab === "companies"
                      ? ["Company", "Owner", "Records", "Status", "Actions"]
                      : ["Name", "Email", "Role", "Created"]
                    ).map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab === "companies"
                    ? data?.companies
                        .filter((c) =>
                          (c.name + " " + c.email)
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div className="customer">
                                <span className="customer-avatar">
                                  {initials(c.name)}
                                </span>
                                <span>
                                  <strong>{c.name}</strong>
                                  {!!c.sampleImported && (
                                    <small>Demo workspace</small>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td>
                              <strong>{c.ownerName}</strong>
                              <div className="muted-note">{c.email}</div>
                            </td>
                            <td>{c.records}</td>
                            <td>
                              <Badge>
                                {c.suspended ? "Suspended" : "Active"}
                              </Badge>
                            </td>
                            <td>
                              <div className="admin-actions">
                                <Button
                                  icon="ArrowUpRight"
                                  disabled={busy}
                                  onClick={() =>
                                    void action("/api/admin/switch", "POST", {
                                      id: c.id,
                                    })
                                      .then(
                                        () => (location.href = "/dashboard"),
                                      )
                                      .catch((e) => setError(e.message))
                                  }
                                >
                                  Open workspace
                                </Button>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void action(
                                      "/api/admin/companies",
                                      "PATCH",
                                      { id: c.id, suspended: !c.suspended },
                                    ).catch((e) => setError(e.message))
                                  }
                                >
                                  {c.suspended ? "Reactivate" : "Suspend"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    : data?.users
                        .filter((u) =>
                          (u.name + " " + u.email)
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((u) => (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.name}</strong>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <Badge>
                                {u.role === "superadmin"
                                  ? "Super admin"
                                  : "Company owner"}
                              </Badge>
                            </td>
                            <td>
                              {new Date(u.createdAt).toLocaleDateString(
                                "en-US",
                                { timeZone: "Asia/Dhaka" },
                              )}
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
            {!data && <div className="empty">Loading platform records…</div>}
          </section>
          <div className="admin-note">
            <Icon name="ShieldCheck" size={17} />
            <p>
              Company access is isolated for regular accounts. Super
              administrators can inspect and manage all company workspaces.
              Company creation does not send an email.
            </p>
          </div>
        </main>
      </div>
      {open && (
        <Modal
          title="Give a new business a good beginning."
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError("");
              const payload = Object.fromEntries(new FormData(e.currentTarget));
              void action("/api/admin/companies", "POST", payload)
                .then(() => setOpen(false))
                .catch((e) => setFormError(e.message));
            }}
          >
            <div className="form-stack">
              {[
                ["name", "Company name", "text"],
                ["ownerName", "Owner name", "text"],
                ["email", "Owner email", "email"],
                ["password", "Initial password (12+ characters)", "password"],
              ].map(([name, label, type]) => (
                <label key={name}>
                  {label}
                  <input
                    className="field"
                    name={name}
                    type={type}
                    required
                    minLength={name === "password" ? 12 : 2}
                    maxLength={name === "password" ? 72 : 200}
                    autoComplete={name === "password" ? "new-password" : "off"}
                  />
                </label>
              ))}
            </div>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button primary type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create company"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
