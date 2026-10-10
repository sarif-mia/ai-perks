"use client";
import { useEffect, useState } from "react";
import { Badge, Button } from "./ui";
import { retryableAction } from "@/lib/workflow-policy";
type Run = {
  id: string;
  action: string;
  status: string;
  sourceKind: string;
  createdAt: string;
  result: string;
};
export default function WorkflowRuns() {
  const [runs, setRuns] = useState<Run[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/automations/runs");
    const d = (await r.json()) as { runs: Run[]; error?: string };
    if (!r.ok) throw new Error(d.error);
    setRuns(d.runs);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function process(retryId?: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/automations/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryId }),
      });
      const d = (await r.json()) as { runs: Run[]; error?: string };
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">EVERY ACTION, ACCOUNTED FOR</div>
          <h1>Your workflows in motion.</h1>
          <p>
            Review completed actions, pending work and AI drafts. External
            Google operations are not automatically retried after a failure.
          </p>
        </div>
        <div className="form-actions">
          <Button
            disabled={busy}
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            Refresh
          </Button>
          <Button primary disabled={busy} onClick={() => void process()}>
            Process pending
          </Button>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="card-grid">
        {runs.map((run) => {
          let result: { message?: string; reply?: string; url?: string } = {};
          try {
            result = JSON.parse(run.result || "{}");
          } catch {}
          return (
            <article className="panel entity-card" key={run.id}>
              <div className="entity-content">
                <div className="entity-top">
                  <strong>{run.action}</strong>
                  <Badge>{run.status}</Badge>
                </div>
                <p>{result.message || "Waiting for execution."}</p>
                {result.reply && (
                  <blockquote className="workflow-draft">
                    {result.reply}
                  </blockquote>
                )}
                <div className="entity-meta">
                  <span>
                    {run.sourceKind} ·{" "}
                    {new Date(run.createdAt).toLocaleString("en-US", {
                      timeZone: "Asia/Dhaka",
                    })}
                  </span>
                </div>
                <div className="form-actions">
                  {result.reply && (
                    <Button
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(result.reply!)
                          .catch(() =>
                            setError(
                              "Copy unavailable. Select and copy the draft.",
                            ),
                          )
                      }
                    >
                      Copy draft
                    </Button>
                  )}
                  {result.url &&
                    /^https:\/\/(?:mail\.google\.com|calendar\.google\.com|tasks\.google\.com|docs\.google\.com)\//.test(
                      result.url,
                    ) && (
                      <a
                        className="btn"
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google ↗
                      </a>
                    )}
                  {run.status === "failed" && retryableAction(run.action) && (
                    <Button
                      disabled={busy}
                      onClick={() => void process(run.id)}
                    >
                      Retry local action
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!runs.length && (
        <section className="panel empty">
          <h3>A clear history starts here.</h3>
          <p>
            Enable a rule and the master switch, then create or update a
            matching record.
          </p>
        </section>
      )}
    </>
  );
}
