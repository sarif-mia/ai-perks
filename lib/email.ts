import { config } from "./server";
/** Optional transactional approval notice. Never includes credentials. */
export async function approvalEmail(email: string, company: string) {
  const c = config();
  if (!c.RESEND_API_KEY || !c.EMAIL_FROM || !c.APP_URL) return "not_configured";
  try {
    const url = new URL("/login", c.APP_URL);
    if (url.protocol !== "https:") return "invalid_configuration";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: c.EMAIL_FROM,
        to: [email],
        subject: "Your AI Perks company is approved",
        text: `Your company ${company} has been approved. Sign in with your existing email and password: ${url.href}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? "accepted_by_provider" : "failed";
  } catch {
    return "failed";
  }
}
