import type { Metadata } from "next";
import "../marketing.css";
export const metadata: Metadata = { title: "Terms — AI Perks" };
export default function Terms() {
  return (
    <div className="mk-legal">
      <header>
        <a className="mk-logo" href="/">
          ai perks<span>✳</span>
        </a>
        <a href="/login">Sign in ↗</a>
      </header>
      <main>
        <span className="mk-kicker">A CLEAR PLACE TO BEGIN</span>
        <h1>Using AI Perks.</h1>
        <p>
          Updated 10 October 2026. These terms describe access to the current
          service. Contact us if your company requires a separate agreement.
        </p>
        <h2>Company access</h2>
        <p>
          Self-registration creates an approval request. A platform
          administrator must approve your company before you can sign in. Keep
          your login details private and provide accurate business information.
          Administrators may suspend access or reset owner credentials for
          platform administration and support.
        </p>
        <h2>Your information and messages</h2>
        <p>
          Only add information you are entitled to use. You are responsible for
          the business facts, customer information and messages you submit. Do
          not use the service for unlawful activity, unsolicited abuse,
          impersonation or attempts to access another company’s data.
        </p>
        <h2>AI drafts and external delivery</h2>
        <p>
          AI output can be inaccurate. Review prices, policies, availability and
          promises before using a reply. Draft generation and local message
          storage do not guarantee delivery to an external customer. Provider
          connections, messaging windows and provider terms may affect delivery
          and availability.
        </p>
        <h2>Provider quotas and charges</h2>
        <p>
          Free-tier AI access is limited by provider quotas and availability.
          Public subscription pricing and online checkout are not currently
          offered. Any commercial arrangement should be agreed directly with the
          platform owner; paid provider services require separate configuration.
        </p>
        <h2>Service availability</h2>
        <p>
          Features and integrations may change as the product develops. The
          service does not currently include a published uptime commitment.
          Maintain appropriate copies of critical business records and contact
          us about support or data requests.
        </p>
        <h2>Contact and privacy</h2>
        <p>
          Questions about access or a company arrangement? Email{" "}
          <a href="mailto:sarifmia.ofc@gmail.com">sarifmia.ofc@gmail.com</a>.
          See the <a href="/privacy">privacy notice</a> for information about
          accounts, workspace data and AI processing.
        </p>
      </main>
      <footer>
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="mailto:sarifmia.ofc@gmail.com">Contact</a>
      </footer>
    </div>
  );
}
