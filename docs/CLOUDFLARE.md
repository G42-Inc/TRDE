# TRDE on Cloudflare Workers

The existing application is packaged as a full-stack Worker using OpenNext. It
retains the Next.js pages, API routes, server actions, Clerk identity, Supabase
data, and Stripe billing. Source belongs in **G42-Inc/TRDE**. This configuration
does not establish that a live deployment or authenticated persistence has passed;
see `HANDOFF.md` for the latest verified status.

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
3. Run the checks above and deploy with `pnpm --filter web deploy` from the root.
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

## Billing verification

Billing remains in Stripe test mode until a separate payment acceptance pass.
Failed webhook attempts now remain eligible for redelivery, successful retries
clear the failure record, and completed deliveries deduplicate. Processing
failures return HTTP 500 so Stripe can retry. The local retry queue stores the
Stripe resource and accepts both that shape and older wrapped payloads.
Regression tests exercise signed deliveries, database failures followed by
recovery, duplicates, queue payloads, and legacy retry recovery. These fixes do
not by themselves verify real payments or every subscription lifecycle case.

## Validation recorded on November 8, 2026

The production Next build and complete OpenNext build passed with type checking
enabled. Wrangler's initial dry run reported 2,440.68 KiB compressed Worker code
and 444 public asset files. The refreshed backend build passed as well. After
the environment guard ran, a scan of the complete Worker output found no values
matching configured private keys and secrets. A regression test verifies both
public-config preservation and rejection of secrets embedded elsewhere in the
generated server bundle.

The local Workers preview returned HTTP 200 for the landing page, HTTP 401 JSON
for signed-out trade API access, HTTP 401 for a forged `x-clerk-user-id` header,
and a sign-in redirect for the protected trade page. An invalid Stripe webhook
signature returned HTTP 400. The Clerk webhook returned HTTP 500 because its
signing secret was not configured. Five focused runtime tests passed: lazy
configuration, Stripe fetch/signatures (including tampering and expiration),
token encryption, React text escaping, and ProjectX credential redaction.

These checks used the local configuration and do **not** establish working remote
database access, authenticated save/read/edit, or a live Cloudflare URL. Public
backend configuration changes require a fresh build before deployment.

## References

- [OpenNext setup](https://opennext.js.org/cloudflare/get-started)
- [OpenNext build and runtime environment configuration](https://opennext.js.org/cloudflare/howtos/env-vars)
- [OpenNext Stripe fetch transport](https://opennext.js.org/cloudflare/howtos/stripeAPI)
- [Stripe asynchronous webhook verification example](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/deno/main.ts)
- [Cloudflare Node crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [Clerk CSP requirements](https://clerk.com/docs/guides/secure/best-practices/csp-headers)
