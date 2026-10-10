import type { Metadata } from "next";
import "../marketing.css";
export const metadata: Metadata = { title: "Privacy — AI Perks" };
export default function Privacy() {
  return (
    <div className="mk-legal">
      <header>
        <a className="mk-logo" href="/">
          ai perks<span>✳</span>
        </a>
        <a href="/signup">Request a workspace ↗</a>
      </header>
      <main>
        <span className="mk-kicker">YOUR WORKSPACE. YOUR DATA.</span>
        <h1>Privacy, in plain words.</h1>
        <p>
          Updated 10 October 2026. This notice describes the current AI Perks
          service.
        </p>
        <h2>Account and workspace information</h2>
        <p>
          We store account names, email addresses, password hashes, login
          sessions and company settings. Workspace data may include
          conversations, messages, customer records, products, orders, knowledge
          and activity logs. Passwords are hashed; they are not returned by the
          account API.
        </p>
        <h2>Who can access a workspace</h2>
        <p>
          Regular company accounts access their own workspace. Platform Super
          Admin accounts can manage company approval, suspension and owner
          access and inspect workspace data for administration and support.
        </p>
        <h2>AI processing</h2>
        <p>
          When you request an AI draft, relevant conversation messages and
          business knowledge are sent to the configured AI provider. Gemini is
          currently supported. Google’s free-tier terms may allow prompts and
          responses to be used to improve its products. Avoid submitting
          sensitive personal information. Read the{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gemini API terms
          </a>{" "}
          before using AI with customer data.
        </p>
        <h2>Connected Google accounts</h2>
        <p>
          If enabled and authorized, a connected Google account can receive
          draft emails, calendar events, task records or spreadsheet exports
          created by your workflows. Google service access is authorized
          separately. Saved access/refresh tokens are encrypted on the server.
          Disconnecting removes the workspace’s stored connection; Google
          permissions can also be removed in your Google account.
        </p>
        <h2>Infrastructure and integrations</h2>
        <p>
          The service is hosted on Vercel and stores application data in Neon
          PostgreSQL. Session cookies support authentication; no advertising
          tracking is intentionally configured. Configured messaging and email
          providers receive the information needed to perform the action you
          request. External integrations require separate setup and may have
          their own policies.
        </p>
        <h2>Data requests and retention</h2>
        <p>
          Data remains stored until removed through available workspace controls
          or handled by the administrator. Contact{" "}
          <a href="mailto:sarifmia.ofc@gmail.com">sarifmia.ofc@gmail.com</a> for
          access, correction, account deletion or privacy questions. We do not
          currently offer an automated account export or account deletion
          workflow.
        </p>
      </main>
      <footer>
        <a href="/">Home</a>
        <a href="/terms">Terms</a>
        <a href="mailto:sarifmia.ofc@gmail.com">Contact</a>
      </footer>
    </div>
  );
}
