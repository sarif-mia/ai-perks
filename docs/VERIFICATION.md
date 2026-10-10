# Verification

The initial business dashboard passed a 23-view desktop/mobile end-to-end run. Source validation tests cover sample fixture validity, collection allowlisting, invalid monetary values, quantity validation, stripped ownership/role fields, email validation and HMAC payload tampering. Subsequent standalone-auth and admin checks are run against the final build before deployment.

## Workers local end-to-end suite

Start `npm run dev` on port 5173 after applying pending local D1 migrations. Then run `npm run test:e2e`. The suite creates uniquely named QA accounts and records, exercises the UI and checks authentication, forged identity headers, validation, same-origin writes, stale-version conflicts, tenant scoping, durable records, order retention, downloads, inbox routing/replies, search and dark mode. Browser screenshots are saved under ignored `test-results/`.

The suite uses the locally installed Chrome on macOS. Set `CHROME_PATH` for another executable. Local test databases are separate from production. Orders created by tests are cancelled rather than deleted, respecting the application's order-retention behavior.

## Standalone Next.js

`npm run build:vercel` builds the actual Vercel target with the Node/PostgreSQL runtime adapter. `npm run typecheck` checks both runtime profiles. Verify production signup/login, super-admin authorization, company switching, server persistence, regular-user isolation and mobile views after deployment.

## Unverified integrations

Live model responses, real social-message delivery, OAuth onboarding, couriers, payments, campaign execution and public visitor chat cannot be inferred from frontend tests. Their status and limits are documented separately. A successful deployment is verified from the provider result and an HTTP/browser check of the public URL.
