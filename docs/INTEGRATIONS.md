# Integration setup

Never place API keys in client components, query strings, source control or browser forms. Use server-side environment variables. For local Workers development, put secrets in ignored `.dev.vars`. For hosted Sites, configure environment secrets through the Site's environment settings.

## Anthropic drafts

Set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to a model enabled for your provider account. The server calls the [official Messages API](https://platform.claude.com/docs/en/api/messages/create). Active product and knowledge records are included as reference material. The model is instructed to avoid invented facts and draft for review. Knowledge text can still contain prompt injection; review outputs and do not use drafts as an authorization decision.

The route bounds message/reference size and provider timeout and records draft attempts. The recent-event rate check limits ordinary bursts, but is not a distributed atomic rate limiter. Add provider spend caps and a dedicated quota ledger before broad production use. Billing shows recorded request attempts, not provider token cost or an invented credit balance.

## Messenger

The [official Meta sample repository](https://github.com/fbsamples/messenger-platform-samples) provides platform onboarding and permissions guidance.

Set the following server variables:

- `META_APP_SECRET`: Meta app secret used to validate raw webhook payloads.
- `META_VERIFY_TOKEN`: a private, randomly generated webhook verification value.
- `META_PAGE_ACCESS_TOKEN`: page-scoped access token with approved messaging permission.
- `META_PAGE_ID`: the specific configured page; other pages are ignored.
- `META_GRAPH_VERSION`: a currently supported Graph API version for your app.
- `META_WORKSPACE_ID`: the workspace ID shown in Integration Setup.

Webhook path: `/api/webhooks/meta`. It supports the GET verification handshake and HMAC-SHA256 POST verification. Incoming text events are deduplicated by Meta message ID and saved into the configured workspace. Attachments are represented by an incoming placeholder; file download/vision are not implemented. Incoming messages are routed to the team; this release does not auto-send model output.

In the inbox, manually check the external-delivery option to send a reply through the API. The server enforces a recent incoming message within the standard 24-hour window. A locally saved reply does not become an external delivery. The page token is scoped to one workspace and one configured page. This integration is not a multi-tenant OAuth credential store.

**Private hosting limitation:** Meta cannot complete unauthenticated webhook requests against an owner-private Site. A live production integration needs a publicly reachable, signature-validated ingress that forwards to the appropriate backend, or a separately deployed server. Do not change the Site audience just to make webhook testing possible. Public authentication headers must come from a trusted gateway; never trust client-supplied identity headers on an unprotected deployment.

## Planning and previews

- Broadcasts, posts, follow-ups and automations store plans and configuration. A scheduler/queue and platform-specific eligibility checks are required for execution.
- Website Chat is an authenticated visual preview. A public widget requires visitor-session tokens, domain validation, abuse limits, public ingress and CORS protection.
- Team is a roster only. Shared workspaces require membership tables, invitation acceptance, role checks on every API, and suitable hosting access.
- Courier booking and payment processing require separate provider APIs, reconciliation, idempotency and provider webhook verification. No money is charged by this app.
- Notifications list waiting conversations. Browser permission can be requested manually, but background web push subscriptions and service workers are not configured.

## Standalone hosting and account access

Vercel and Netlify use the Node/PostgreSQL adapter. Set DATABASE_URL, apply db/postgres migrations, and deploy the Next.js build. Private Sites uses the Cloudflare/D1 adapter and retains the platform's outer access policy. The application itself uses its own email/password session system in both profiles. It ignores client-supplied platform identity headers.

The super-admin role is assigned only by the trusted bootstrap script. Browser signup never accepts a role. A super-admin may select a company through the protected switch endpoint; regular accounts ignore the selection cookie. Company suspension blocks regular workspace operations while preserving administrator access.

## Database and scale

D1 migrations are owned by Drizzle. Never modify an applied migration; append a new one. Dashboard snapshots currently load up to 4,000 records and 100 recent events; collection exports load up to 2,000 records. Add cursor pagination, aggregate reporting queries and retention policies before exceeding these bounds. Seed loading is intended for a single owner configuring an empty workspace, not concurrent imports.


## Company approval and free-tier AI

Self-signup requires a company name and creates a pending company without a session. Super Admin → Companies → Approve company enables login. Reject or Suspend blocks login and revokes sessions. Create company provisions an approved owner using the supplied email/password. Reset password revokes all owner sessions; passwords are never returned by the API.

Configure GEMINI_API_KEY in Vercel, optionally GEMINI_MODEL (default gemini-2.5-flash), then redeploy. Gemini free-tier has project quotas and Google free-tier data-use terms; evaluate these before submitting customer data. Drafts remain subject to human review. https://ai.google.dev/gemini-api/docs/pricing

Facebook Messenger currently requires the server-side page configuration documented above. This is a single configured page/workspace integration, not multi-company Facebook OAuth login. Meta app credentials and approved permissions are required before a public company onboarding flow can operate. Email delivery is not enabled without a provider and verified sender; account approval is visible in the admin console and owners can sign in after approval.
