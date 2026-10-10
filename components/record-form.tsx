"use client";
import { useState } from "react";
import type { Module } from "@/lib/modules";
import { defaults } from "@/lib/modules";
import type { Payload, RecordItem } from "@/lib/models";
import { Button } from "./ui";
export default function RecordForm({
  module,
  record,
  onSave,
  onClose,
}: {
  module: Module;
  record?: RecordItem;
  onSave: (data: Payload) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState<Payload>(record?.data || defaults(module));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {module.fields.map((f) => (
          <label key={f.key} className={f.type === "textarea" ? "wide" : ""}>
            {f.label}
            {f.required && <span className="required">*</span>}
            {f.type === "textarea" ? (
              <textarea
                className="field"
                rows={5}
                maxLength={
                  f.key === "content" && module.kind === "knowledge"
                    ? 20000
                    : 4000
                }
                required={f.required}
                value={String(data[f.key] || "")}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              />
            ) : f.type === "select" ? (
              <select
                className="select"
                value={String(data[f.key])}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              >
                {f.options?.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : f.type === "toggle" ? (
              <input
                type="checkbox"
                checked={!!data[f.key]}
                onChange={(e) =>
                  setData({ ...data, [f.key]: e.target.checked })
                }
              />
            ) : (
              <input
                className="field"
                type={f.type || "text"}
                required={f.required}
                maxLength={200}
                min={f.type === "number" ? (f.min ?? 0) : undefined}
                step={
                  f.type === "number"
                    ? f.key === "price" ||
                      f.key === "amount" ||
                      f.key === "value"
                      ? ".01"
                      : "1"
                    : undefined
                }
                value={String(data[f.key] ?? "")}
                onChange={(e) =>
                  setData({
                    ...data,
                    [f.key]:
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}
          </label>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button primary type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : record
              ? "Save changes"
              : `Create ${module.singular}`}
        </Button>
      </div>
    </form>
  );
}
