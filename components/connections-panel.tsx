"use client";
import { useEffect, useState } from "react";
import { Badge, Button, Icon } from "./ui";
type Provider = {
  id: string;
  name: string;
  description: string;
  action: string;
  connected: boolean;
  accountEmail?: string;
  spreadsheetId?: string;
};
export default function ConnectionsPanel() {
  const [data, setData] = useState<{
      googleConfigured: boolean;
      providers: Provider[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const r = await fetch("/api/connections");
    const d = (await r.json()) as {
      googleConfigured: boolean;
      providers: Provider[];
      error?: string;
      url?: string;
    };
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    const params = new URLSearchParams(location.search);
    if (params.get("error"))
      setError("Google access was not granted. You can connect again.");
  }, []);
  async function act(provider: Provider, disconnect = false) {
    setBusy(provider.id);
    setError("");
    try {
      const r = await fetch(
        disconnect ? "/api/connections" : "/api/connections/google/start",
        {
          method: disconnect ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: provider.id }),
        },
      );
      const d = (await r.json()) as {
        googleConfigured: boolean;
        providers: Provider[];
        error?: string;
        url?: string;
      };
      if (!r.ok) throw new Error(d.error);
      if (d.url) location.href = d.url;
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR ACCOUNTS, WORKING TOGETHER</div>
          <h1>Connections for your everyday work.</h1>
          <p>
            Connect a personal or business Google account to each service. Your
            company workspace keeps its own connections.
          </p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {data && !data.googleConfigured && (
        <section className="panel integration-box">
          <Icon name="Settings2" />
          <div>
            <strong>Google account connection needs platform setup.</strong>
            <p>
              The platform owner must configure the Google OAuth app before
              accounts can be connected.
            </p>
          </div>
        </section>
      )}
      <div className="card-grid">
        {data?.providers.map((p) => (
          <article key={p.id} className="panel entity-card">
            <div className="entity-content">
              <div className="entity-top">
                <span className="feature-icon">
                  <Icon
                    name={
                      p.id === "google-gmail"
                        ? "Mail"
                        : p.id === "google-calendar"
                          ? "CalendarDays"
                          : p.id === "google-sheets"
                            ? "Table2"
                            : "ListTodo"
                    }
                    size={23}
                  />
                </span>
                <Badge>{p.connected ? "Connected" : "Not connected"}</Badge>
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              {p.accountEmail && (
                <p>
                  <strong>{p.accountEmail}</strong>
                </p>
              )}
              <div className="form-actions">
                <Button
                  primary
                  disabled={!!busy || !data.googleConfigured}
                  onClick={() => void act(p)}
                >
                  {busy === p.id
                    ? "Working…"
                    : p.connected
                      ? "Reconnect"
                      : "Connect account"}
                </Button>
                {p.connected && (
                  <Button disabled={!!busy} onClick={() => void act(p, true)}>
                    Disconnect
                  </Button>
                )}
              </div>
              {p.spreadsheetId && (
                <a
                  className="text-button"
                  href={`https://docs.google.com/spreadsheets/d/${encodeURIComponent(p.spreadsheetId)}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open export spreadsheet ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="panel integration-detail">
        <h3>Choose what happens automatically</h3>
        <p>
          In Automations, create a rule and choose the connected Google action.
          Enable the master switch in Settings. New matching records will
          trigger the rule; review results in Workflow runs.
        </p>
        <p>
          Disconnect removes this workspace’s saved service tokens. You can also
          remove the app’s permission in your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google account settings ↗
          </a>
          .
        </p>
      </div>
    </>
  );
}
