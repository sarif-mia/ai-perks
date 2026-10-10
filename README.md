# AI Perks — Business SaaS

A modern, standalone business control panel inspired by the authenticated AiPraktor dashboard reviewed in the user's Chrome session. Includes company workspaces and a separate super-admin console. This is an original implementation; proprietary source code, payment details and reference-account data were not copied.

## Stack

React 19, Next.js 16, strict TypeScript, Neon PostgreSQL, Zod, Recharts, Lucide icons and responsive CSS. The primary deployment target is Vercel. A retained Vinext/Cloudflare Workers and D1 profile supports local and private Sites development.

## Run the Next.js application

Requires Node 24 (Node >=22.13.0 is supported for the framework).

```sh
npm ci
# Configure DATABASE_URL in an ignored .env.local file.
node --env-file=.env.local scripts/migrate-postgres.mjs
npm run dev:next
```

Open http://localhost:3000. Sign up to create an isolated company workspace. Existing users sign in at `/login`; super administrators are directed to `/admin`.

## Deploy on Vercel

Import this repository into Vercel. `vercel.json` selects `npm run build:vercel`. Provision/connect a Neon PostgreSQL database and set `DATABASE_URL` for the desired deployment environment, then run the migration script against that database. Deploy with Vercel CLI or the connected Git repository. Neon credentials must never be committed.

Netlify can use the supplied `netlify.toml` and the same PostgreSQL backend; that profile has not been deployed or verified. Cloudflare standalone setup is available in `scripts/deploy-standalone.mjs` and remains optional.

## Super administrator and demo company

No admin password is included in source code or environment templates. Bootstrap an administrator through hidden stdin:

```sh
node --env-file=.env.local --experimental-strip-types scripts/bootstrap-admin.mjs --postgres
```

The command prompts for one JSON object containing `email`, `password` and optional `name` / `companyName`. Input is hidden when run in a terminal. It hashes the password with bcrypt, creates or updates the super-admin account, revokes its existing sessions, and creates a demo company with sample products, orders, leads and conversations. It does not create a public bootstrap endpoint. Run this only as a trusted operator.

Administrators can create companies with owner accounts, inspect company workspaces, suspend/reactivate companies, and list users. Regular accounts cannot access platform administration or another company's records. A team roster is separate from account access and does not grant permissions.

## Checks

```sh
npm run typecheck
npm test
npm run build:vercel
npm run test:e2e
```

The end-to-end suite defaults to the local Workers preview at port 5173; see `docs/VERIFICATION.md`. Screenshots and test outputs are ignored by Git.

## Application features

23 business views: overview, inbox, notifications, leads, saved replies, orders, activity, analytics, follow-ups, broadcasts, products, posts, knowledge, website preview, agent desk, automation rules, bookings, channels, billing/usage, team roster, setup, feedback and settings. All business records persist on the server. Features include CRUD, six-stage leads, chat takeover/resolve, saved replies, CSV exports, activity logging, search/filtering, real record-based analytics, opt-in sample data and dark mode.

Own authentication uses 12+ character passwords, bcrypt hashing, random database-backed sessions, HttpOnly/SameSite cookies, HTTPS Secure cookies, login throttling, logout revocation and password changes that revoke all sessions. Signup cannot assign administrative roles. Email delivery, email verification, password-recovery emails and MFA are not configured.

## Integration status

Optional Anthropic draft generation and manual Messenger delivery are implemented but require valid server credentials and real-account testing. Signed Meta webhook ingress validates raw payload signatures and deduplicates message IDs. No provider credentials are included.

Broadcasts, follow-ups, posts and automations currently store plans/configuration; background sending is not enabled. Website Chat is a design preview. WhatsApp/Instagram delivery, public visitor sessions, voice, courier booking, payment processing/credit wallets, background push and shared-team invitation/authorization are not implemented. UI notices identify these limits. See `docs/INTEGRATIONS.md`.

This is a functioning standalone SaaS workspace, not complete production feature parity with AiPraktor. Provider-dependent workflows need credentials and production verification before live use.

## Source layout

- `app/`: Next.js pages and authenticated API routes
- `components/`: business workspace, auth forms, admin console and reusable UI
- `lib/`: validation, authentication, tenant scope, SQL adapters and provider clients
- `db/postgres/`: PostgreSQL schema; `db/schema.ts` and `drizzle/`: optional D1 migrations
- `scripts/`: migrations, secure administrator bootstrap and deployment helpers
- `vercel.json`, `netlify.toml`: standalone hosting configuration
- `.openai/hosting.json`, `build/`: retained private Sites hosting profile
