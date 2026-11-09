# TRDE on Cloudflare Workers

Live app: **[trde.rr-seshify.workers.dev](https://trde.rr-seshify.workers.dev)**.
The existing Next.js application runs as a full-stack OpenNext Worker with Clerk
identity and a dedicated Supabase database. Source remains in **G42-Inc/TRDE**, on
`work/cloudflare-deployment` with [PR #1](https://github.com/G42-Inc/TRDE/pull/1).
`main` still contains the original public baseline. See `HANDOFF.md` for the
current acceptance checkpoint and outstanding work.

| Deployment | Source checkpoint | Cloudflare version |
| --- | --- | --- |
| Initial usable API deployment | `430e6570c702d356ead9a78fabfc46eba2a8b1ed` | `d63028ab-20cb-4b89-bd1a-5758dbc6bd88` |
| Optional strategy and local form dates | `7b8573d73a3d567116daae6eff7553d2ae8f89f8` | `179f00e0-3221-4844-9f13-c4fe7c2b3a0d` |
| Correct contract calculations, preserve imported history, and safe Clerk replay | `d3040c54c72ab9abe0f56b36ae91ba91301f2be8` | `f41c9a33-ff74-4a5a-aea6-4e79e7275893` |
| Preserve unsaved drafts during background refresh | `7178054f0415c159cf7cc361c66b883ea930a8e7` | `5794e405-0cce-458c-ad73-00c480276bb9` |

The fourth version is live and passes 49 focused tests, production builds, type
validation and artifact secret scans. All nine authenticated API acceptance
groups and the signed Clerk replay regression passed on the third version; the
fourth changes only editor initialization and passed its immediate edit/save/reload
browser regression. Final browser calculation and sign-out checks passed.

## Build and preview

Run commands from the repository root using the Node and pnpm versions declared
in `package.json`. Install the workspace dependencies, including local packages:

```sh
pnpm install --frozen-lockfile
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build:worker
pnpm --filter web exec opennextjs-cloudflare preview
```

`build:worker` performs the production Next build and then packages it for
Workers. Preview must run the packaged Worker, because a successful `next dev`
session does not test Workers compatibility. The Next app root is `apps/web`.
The build output is `.open-next/worker.js` with static assets in
`.open-next/assets`, both relative to that app root.

The Worker is named `trde`; its `WORKER_SELF_REFERENCE` service binding has the
same name. `workers_dev` is enabled. Keep these names aligned if choosing another
Worker name. `nodejs_compat` enables the Node APIs used by Next and the existing
AES-GCM token vaults. Stripe requests use fetch and webhook signatures use
asynchronous Web Crypto. User data is loaded dynamically from Supabase; the app
does not currently require an R2 incremental cache. Do not configure persistent
Next caching for authenticated records.

## Configuration

Use the intended TRDE Cloudflare, Clerk, and Supabase resources. Do not substitute
an unrelated connected project. Confirm database schema and backend access before
applying migrations. Keep Stripe test and live credentials distinct.

| Setting | Where needed | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Build and runtime | Browser authentication, Clerk public host in CSP |
| `CLERK_SECRET_KEY` | Runtime | Session and user verification |
| `CLERK_WEBHOOK_SECRET` | Runtime | Verify `/api/clerk/webhook` deliveries |
| `NEXT_PUBLIC_SUPABASE_URL` | Build and runtime | Application database endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build and runtime | Public Supabase client configuration |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime secret | Server data access; never expose to the browser |
| `STRIPE_SECRET_KEY` | Runtime secret when billing enabled | Checkout, portal, subscription checks |
| `STRIPE_WEBHOOK_SECRET` | Runtime secret when billing enabled | Verify `/api/billing/webhook` deliveries |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Build when billing enabled | Browser payment UI |
| `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_EDGE`, `STRIPE_PRICE_ID_PRO` | Runtime when billing enabled | Existing plan prices |
| `ENCRYPTION_KEY` | Runtime secret when ProjectX connections enabled | Existing 32-byte base64 token-vault key |
| `API_KEY_ENCRYPTION_SECRET` | Runtime secret when provider keys enabled | Separate provider-key vault key |

Do not replace encryption keys for an existing database: that would make saved
credentials unreadable. Optional provider, cron/retry, and administrator settings
should be configured only for features in use. Admin authorization comes from
verified server-controlled identity metadata.

For local Next development, use ignored `apps/web/.env.local`. Supply the same
runtime configuration to Workers preview through ignored `apps/web/.dev.vars`,
with file permissions `600`. Keep these local files aligned when changing the
backend or rotating keys. `NEXTJS_ENV=development` can select the development
environment. Environment files, Wrangler state, and build artifacts are ignored
by Git. Never put secret values in source files, shell arguments, documentation,
screenshots, or public logs.

OpenNext copies local dotenv values into `.open-next/cloudflare/next-env.mjs`.
TRDE's `scripts/prepare-worker.mjs` guard removes all server-only values from that
module after every build. It then scans the entire `.open-next` output against
configured private values and fails the command if a match remains anywhere.
Run the guard immediately before any direct Wrangler/OpenNext upload, including
when deploying an already built artifact. The canonical package build/deploy
scripts include this guard. Runtime secrets must be supplied as bindings; a
secret embedded in Worker source is not a substitute for secret storage.

For hosted builds, configure public build values in Cloudflare's **Build variables
and secrets**. `NEXT_PUBLIC_*` values are compiled into browser assets, so changing
them requires rebuilding. Store runtime secrets with Cloudflare secret storage
(dashboard or Wrangler's interactive secret commands). Build settings and runtime
settings are separate. `keep_vars` preserves dashboard runtime variables during
deployments; it does not configure any missing values.

## Publish and acceptance checks

1. Authenticate Wrangler to the intended Cloudflare account and verify its
   workers.dev subdomain. Review any plan or resource costs before enabling them.
2. Configure the matching Clerk instance and webhook destination for the resulting
   HTTPS URL. Configure the Stripe test webhook endpoint if testing billing.
3. Run the checks above and deploy the guarded build with the command below.
   For Cloudflare Workers Builds, connect the existing **G42-Inc/TRDE** repository,
   retain the monorepo context, and use the same install/build/deploy commands.
4. Record the URL emitted by Cloudflare; do not infer it from the Worker name.
5. Test on that exact URL: landing page, sign-in and sign-out, signed-out API 401,
   forged identity-header rejection, and authorized journal access.
6. As a real authenticated test account, save and reload a futures trade, an
   options trade, and an EDGE trade; edit each and reload again. Check valid zero
   values, timestamps, attachment objects, malformed-input rejection, and account
   isolation. Verify journal save/read as well. A landing page is insufficient.
7. Verify signed Clerk/Stripe webhook deliveries when those integrations are
   enabled. Invalid signatures must be rejected without logging secrets.
8. Record the deployed commit, observed URL, checks, and remaining limitations in
   `HANDOFF.md`, then publish the coherent source changes to G42-Inc/TRDE.

The verified deployment command, from `apps/web`, is:

```sh
node scripts/prepare-worker.mjs
pnpm exec wrangler deploy --secrets-file /tmp/trde-worker-secrets.json
```

The JSON file is a private local runtime-binding map with permissions `600`.
Prepare it from the intended configuration without printing values or adding it
to Git. `--secrets-file` uploads those bindings with the Worker version;
`--env-file` alone does not upload runtime secrets. The configured account and
Worker are already authorized. No paid Cloudflare upgrade was needed.

## Billing verification

Clerk uses its development instance and Stripe uses **test mode**. Actual
provider deliveries were verified: Clerk user.created/user.updated/user.deleted
each received HTTP 200, creating/updating the profile; Stripe subscription.created,
invoice.payment_succeeded, and subscription.deleted each had no pending webhook
deliveries and successful audit rows. The test entitlement changed from active
to canceled. The marked provider fixtures were removed, with no real charges.
Hosted Checkout browser completion has not been exercised. The final version
also passed a signed Clerk creation-event replay after the fixture had an active
Pro entitlement, earned XP, and custom notification choices: all were preserved,
while user.updated still refreshed its profile. The four replay fixture rows
were removed.

Failed webhook attempts now remain eligible for redelivery, successful retries
clear the failure record, and completed deliveries deduplicate. Processing
failures return HTTP 500 so Stripe can retry. The local retry queue stores the
Stripe resource and accepts both that shape and older wrapped payloads.
Regression tests exercise signed deliveries, database failures followed by
recovery, duplicates, queue payloads, and legacy retry recovery. These fixes do
not by themselves verify real payments or every subscription lifecycle case.

## Verified status and limits

The production Next/OpenNext builds, type checks, and artifact secret scans passed.
The current deployed build compressed to 2,439.58 KiB. Its landing page returned
HTTP 200; signed-out and forged-header trade API requests returned HTTP 401.
Nine acceptance groups using real Clerk tokens passed on the live URL, covering
authenticated data save/read/edit and account isolation. Signed synthetic Stripe
failed-event recovery and duplicate suppression also passed against the live
database, and their temporary record was removed.

Browser sign-in, dashboard loading, a first trade without a strategy, and local
form dates were verified. Browser QA then found an inherited futures tick-value
calculation bug and imported-P&L overwrite on notes-only editing. The current
version corrects new calculations and preserves saved amounts, fees, subminute
timestamps, and overnight dates during review-only edits. Its 12 known futures
contracts use exchange-verified tick specifications; other instruments require
explicit specs when recalculating. Historical records are not rewritten. The
live browser saved an ES 4000→4010 trade, quantity 1 and $10 fees, as $490;
a notes-only edit preserved $490, and setting fees to $0 produced $500. Every
change survived reload. The final editor also passed immediate fill/save/reload,
retaining the note and $500 result. Drafts use a single authenticated snapshot
per account and trade, so background refresh cannot replace unsaved input.

Both marked acceptance users and their records were removed after verification;
cleanup confirmed zero owned rows across 30 user-data tables and revoked sessions.
The temporary deployment binding map was deleted; ignored local configuration is
retained privately. No task preview server remains running.

This is a fresh dedicated database. No historical records were migrated from the
original inaccessible backend. Test-mode identity/billing, optional broker
connections, legacy analytics, and mobile are not production certification.
Both webhook signing secrets are configured privately. Changing public backend
configuration requires a fresh build; rotating stored-data encryption keys
requires a separate migration plan.

## References

- [OpenNext setup](https://opennext.js.org/cloudflare/get-started)
- [OpenNext build and runtime environment configuration](https://opennext.js.org/cloudflare/howtos/env-vars)
- [OpenNext Stripe fetch transport](https://opennext.js.org/cloudflare/howtos/stripeAPI)
- [Stripe asynchronous webhook verification example](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/deno/main.ts)
- [Cloudflare Node crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [Clerk CSP requirements](https://clerk.com/docs/guides/secure/best-practices/csp-headers)
