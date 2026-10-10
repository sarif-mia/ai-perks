"use client";
import { useState } from "react";
import { Button } from "./ui";
export default function PasswordForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        if (data.password !== data.confirmPassword) {
          setError("The new passwords do not match.");
          setBusy(false);
          return;
        }
        try {
          const res = await fetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = (await res.json()) as { error?: string };
          if (!res.ok)
            throw new Error(body.error || "Unable to change password.");
          location.href = "/login";
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Unable to change password.",
          );
          setBusy(false);
        }
      }}
    >
      <h3>Change your password</h3>
      <p>Updating your password signs you out of every device.</p>
      <div className="form-stack">
        <label>
          Current password
          <input
            className="field"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
          />
        </label>
        <label>
          New password
          <input
            className="field"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
          />
        </label>
        <label>
          Confirm new password
          <input
            className="field"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={busy} type="submit">
          {busy ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
