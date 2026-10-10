"use client";
import { useState } from "react";
import { Icon } from "./ui";
export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a href="/" className="brand">
          <span className="brandmark">
            a<span>✳</span>
          </span>
          AI Perks
        </a>
        <div className="auth-story-content">
          <span className="auth-eyebrow">
            A LITTLE LESS BUSY. A LOT MORE BUSINESS.
          </span>
          <h1>
            Your business,
            <br />
            beautifully in sync.
          </h1>
          <p>
            Conversations, customers and commerce.
            <br />
            One thoughtful space to make it all happen.
          </p>
          <div className="auth-features">
            {[
              ["Inbox", "One inbox. Every conversation."],
              ["ShoppingBag", "Every order, from hello to doorstep."],
              ["Sparkles", "A little intelligence. A lot of possibility."],
            ].map(([ic, label]) => (
              <div key={ic}>
                <span>
                  <Icon name={ic} size={20} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-story-foot">
          Made for the people behind the business.
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="auth-form-icon">
            <Icon name={signup ? "Leaf" : "Sun"} size={25} />
          </span>
          <div className="eyebrow">
            {signup ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}
          </div>
          <h2>
            {signup ? "Make room for what’s next." : "A good day to grow."}
          </h2>
          <p>
            {signup
              ? "Create your account and make the workspace yours."
              : "Sign in to your business workspace."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const res = await fetch(
                  "/api/auth/" + (signup ? "signup" : "login"),
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  },
                );
                const body = (await res.json()) as {
                  error?: string;
                  role?: string;
                };
                if (!res.ok)
                  throw new Error(body.error || "Unable to sign in.");
                location.href =
                  body.role === "superadmin" ? "/admin" : "/dashboard";
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Unable to continue.",
                );
                setBusy(false);
              }
            }}
          >
            {signup && (
              <label>
                Your name
                <input
                  className="field"
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                className="field"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                maxLength={200}
                required
              />
            </label>
            <label>
              Password
              <input
                className="field"
                name="password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "At least 12 characters" : "Your password"
                }
                minLength={signup ? 12 : 1}
                maxLength={72}
                required
              />
            </label>
            {signup && (
              <p className="auth-note">
                Use a unique password with at least 12 characters.
              </p>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy
                ? "Just a moment…"
                : signup
                  ? "Create your workspace"
                  : "Sign in"}
              <Icon name="ArrowRight" size={16} />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to AI Perks?"}{" "}
            <a href={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create an account"}
            </a>
          </p>
          <div className="auth-privacy">
            <Icon name="ShieldCheck" size={13} />
            Your workspace. Your data.
          </div>
        </div>
        <span className="auth-copyright">AI Perks © 2026</span>
      </section>
    </main>
  );
}
