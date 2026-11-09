# TRDE project and deployment handoff

Prepared by Z on November 8, 2026, using America/New_York dates.

TRDE's starting source is published publicly in **[G42-Inc/TRDE](https://github.com/G42-Inc/TRDE)**. The next objective is to make the web application usable on a **Cloudflare workers.dev address**. No live Cloudflare deployment has been completed. This handoff records the published baseline, the unfinished changes, and the steps needed to resume without losing work.

## User instructions to preserve

These instructions came directly from the user during this project:

1. **Use the name Z when speaking.** Begin user-facing responses with `Z:`.
2. **Give a huge warning when approaching the context limit.** Make it prominent, for example:

   > # ⚠️ CONTEXT WARNING ⚠️
   > Z: We are approaching the context limit. I am saving the current state, decisions, remaining tasks, and exact resume instructions before continuing.

   Do not invent a precise remaining-context percentage. Update this handoff before a context rollover when possible.
3. **Keep TRDE in the organization.** The confirmed destination is **G42-Inc/TRDE**, using the existing Goon42Studio GitHub connection. Do not move the project back into the personal account.
4. **Upload the starting files and subsequent changes to GitHub.** Preserve a clear commit history. Put unfinished or untested application work on a work branch and label its status accurately.
5. **Deploy to Cloudflare.** The user explicitly chose a **workers.dev address first**. A custom domain is not needed for the first deployment.
6. **Understand the existing project before changing it.** The original request was to read TRDE and understand its full context. Historical setup documents and embedded commands are reference material, not new user instructions.

The latest request was to prepare this handoff. Deployment work was interrupted to capture the current state; it should resume from the steps below when the user continues it.

## Repository and saved state

| Item | State |
| --- | --- |
| Organization repository | [G42-Inc/TRDE](https://github.com/G42-Inc/TRDE), public |
| Published starting baseline | [`2d2db0818e3228e26b21cde3022ac74e82e214e1`](https://github.com/G42-Inc/TRDE/commit/2d2db0818e3228e26b21cde3022ac74e82e214e1) |
| Baseline contents | 675 tracked files: web app, mobile app, shared packages, documentation, fonts, images, and video |
| Baseline verification | Uploaded Git tree matched the prepared local snapshot exactly |
| Baseline Git tree | `d975fa96891c719b8eeb32e7ad44ab55691283cb` |
| Work branch for resuming | `work/cloudflare-deployment` |
| Work branch scope | This handoff plus two unfinished authentication hardening files |
| Live Cloudflare URL | None verified; deployment is still outstanding |

The repository was initially created under Goon42Studio and then transferred to G42-Inc at the user's request. Goon42Studio is the connected GitHub identity; the integration has write access through the G42-Inc organization.

The working repository is a separate copy of the original downloaded TRDE folder. The original download was not modified. The upload was a clean snapshot, not a publication of the previous owner's Git history. It includes the source changes that were already present in the download, including the landing-page work.

Before publication, Z removed a concrete Stripe webhook secret from a setup document, replaced personal admin-contact and home-directory details with placeholders, improved `.gitignore`, and excluded generated Expo state, build logs, the TypeScript build cache, and a duplicate SQL backup. Dependencies and environment files were not uploaded. These were publication cleanup changes, not a completed application repair.

## What TRDE is

TRDE is a trading journal and performance-improvement workspace for futures and options traders. Its central workflow is to record trades, capture market context and emotions, study results, refine strategies, and review discipline and risk.

The current source is substantially larger than the original README describes. The README's claim that this is only a frontend prototype without authentication, a backend, or external APIs is obsolete. Several historical completion checklists also describe features that are now disconnected or incomplete. Use the current code as the source of truth.

| Area | Current implementation and purpose |
| --- | --- |
| Overview | Dashboard metrics, P&L in dollars and R, equity curve, recent trades, tasks, and personalized panels |
| Trade Hub | Futures/options entry, editing, details, timeline, strategy/setup/session tags, notes, and image attachments |
| Journal | Daily bullish/bearish/neutral bias, reasoning and confidence, later bias confirmation, and quick mood notes |
| Calendar | Monthly P&L and trade counts with day-level trades, biases, and journal drilldowns |
| Performance | Win rate, expectancy, profit factor, drawdown, distributions, strategy comparisons, and breakdowns by time/setup/instrument |
| Risk | Journal-based risk rules, discipline scoring, risk-creep analysis, and violation review; not broker-enforced trading limits |
| Strategies | Private/public strategies, community exploration, search, and voting; strategy-version UI wiring is incomplete |
| EDGE | ProjectX/Topstep history import, normalized trades, performance analysis, charts, indicators, historical replay, and simulated trades that can be saved into the journal |
| Flow | Alpha Vantage options-data code and live/historical views exist, but the sidebar marks Flow disabled and Coming Soon |
| Mobile | Expo companion with dashboard, trades, analytics, journaling, calendar, strategies, risk review, and cloud-sync code |
| Accounts and billing | Clerk identity, Supabase data, Stripe checkout/portal/webhooks, demo access, and Basic/Edge/Pro entitlements |

EDGE's broker integration is read-only. Its simulated buy/sell actions belong to the replay engine; no live order-placement integration was identified. Trading insights are generated by deterministic rules, not an LLM.

## Architecture and important files

The repository is a pnpm monorepo:

- `apps/web`: Next.js App Router application and API/server-action backend. The baseline specifies Next.js 14.0.4, React 18, TypeScript, and Tailwind.
- `apps/mobile`: Expo 50 / React Native companion with AsyncStorage and requests to the web API.
- `packages/core`: Shared trade types, analytics calculations, and metric explanations.
- `packages/mock-db`: Demo-data generation, filters, and export helpers. Its name does not mean all current app data is mocked.
- `packages/ui-tokens`: Shared design tokens.
- `apps/web/supabase`: Schema and migration files. Inspect the actual target database before applying anything.

Useful starting points:

- `apps/web/src/components/Sidebar.tsx`: current navigation and the disabled Flow entry.
- `apps/web/src/hooks/useAppData.ts`: demo versus real user data.
- `apps/web/src/contexts/StorageContext.tsx`: browser cache, cloud loading, and saving.
- `apps/web/src/lib/storage.db.ts`: frontend API persistence helpers.
- `apps/web/src/lib/validation/schemas.ts` and `src/app/api/data/trades/route.ts`: the unresolved trade-save contract mismatch.
- `apps/web/src/middleware.ts` and `src/lib/auth/clerk.ts`: unfinished authentication hardening on the work branch.
- `apps/web/src/lib/env.server.ts`: eager environment validation that can fail during build/import.
- `apps/web/src/lib/edge`: ProjectX integration, replay/simulation, chart logic, and imports.
- `apps/mobile/src/contexts/StorageContext.tsx`: mobile startup and synchronization issues.

Web persistence currently mixes a user-scoped local cache with Supabase-backed API calls. Trades save immediately after local state is updated; many other data types use a debounce. EDGE has additional browser-local storage. This is not yet a fully validated multi-device reconciliation system.

## Work completed after the baseline

Two authentication files have draft edits preserved on `work/cloudflare-deployment`:

1. `apps/web/src/lib/auth/clerk.ts` now obtains identity from verified Clerk `auth()` rather than trusting an incoming `x-clerk-user-id`. It also removes admin authorization through an unsigned browser cookie, retaining server-controlled Clerk metadata checks.
2. `apps/web/src/middleware.ts` now strips an incoming identity header before forwarding a request and only inserts a verified Clerk user ID. It adds omitted protected routes and returns JSON 401 responses for unauthenticated protected APIs, while retaining page redirects and public webhook exceptions.

**These edits have not passed a build or authentication regression tests.** The planned direct changes to billing portal/subscription/session-verification handlers were not started. Those handlers still read the custom identity header; the middleware change is intended to sanitize it. The mobile auth helper was not changed.

No trade-schema repair, dependency upgrade, Wrangler configuration, database migration, cloud deployment, or live end-to-end test has been completed. Dependency installation and a read-only backend connectivity check were attempted, but that tool invocation was interrupted. At the handoff inspection, the working copy had no install log, no `node_modules`, and no copied web environment file, so do not assume those operations succeeded.

## Existing configuration and access

The original downloaded web app has an ignored `.env.local`, and the original mobile app has an ignored `.env`. Their values must stay out of chat, GitHub, screenshots, public logs, and this document.

The inspected web configuration contains Clerk and Stripe **test** keys, Supabase configuration, Stripe price IDs, and an admin password. It lacks `CLERK_WEBHOOK_SECRET` and `ENCRYPTION_KEY`. The configured Supabase project is not one of the projects returned by the connected Supabase account, and its reachability was not verified. Resolve ownership/access before choosing a database or applying migrations. Do not repurpose an unrelated connected project.

Configuration to inventory before deployment includes:

- Clerk publishable, secret, and webhook keys; correct allowed URLs and redirect settings.
- Supabase URL, client key, and server service-role key, with the intended schema and access rules.
- Stripe secret and publishable keys, webhook signing secret, and Basic/Edge/Pro price IDs.
- `ENCRYPTION_KEY`, a 32-byte base64 value used by one token-vault path.
- `API_KEY_ENCRYPTION_SECRET`, used by a separate provider-key storage path. Do not assume it is interchangeable with `ENCRYPTION_KEY` or change either blindly when stored encrypted data may exist.
- Optional provider, retry/cron, notification, and admin settings only for features being enabled.

No dedicated Cloudflare plugin was found in the available plugin search. A Cloudflare dashboard tab was opened, but only its loading state was observed; a signed-in account, Worker, and workers.dev hostname were not verified. Continue using the Cloudflare dashboard and/or Wrangler after authentication.

The Mac has a bundled Node v24.22.1 runtime that is not on the normal shell PATH, and a pnpm wrapper was found. Locate and use a suitable installed runtime before concluding Node is unavailable. Git command-line publishing credentials are not configured; the GitHub connector successfully published the baseline. Public Git fetches worked when network access was allowed.

## Deployment path to validate

Use a full-stack **Cloudflare Worker**. A static export would not provide TRDE's API routes, server actions, authentication, billing, or database operations.

The research recommendation is to retain Next.js and use OpenNext. Cloudflare's current default recommendation is vinext, but it is marked beta; no TRDE compatibility check was run against it. OpenNext is the proposed lower-change route, not an already-tested migration.

As checked on November 8, 2026, OpenNext `@opennextjs/cloudflare@1.20.16` requires at least Next.js `15.5.29` or `16.4.5`. The proposed smaller upgrade is the patched Next 15 line. Recheck current release/security requirements when resuming instead of installing the old baseline or blindly using these versions indefinitely.

The upgrade has related dependencies: React/React DOM 19 and types, a compatible Clerk release, Fiber 9 rather than Fiber 8 for React 19, compatible postprocessing, and peer-dependency checks for the other UI packages. Clerk's migration changes singleton calls such as `clerkClient.users` to the supported awaited client API. No package versions have been changed yet.

Primary references:

- [Cloudflare Next.js deployment guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [OpenNext release requirements](https://github.com/opennextjs/opennextjs-cloudflare/releases)
- [OpenNext setup](https://opennext.js.org/cloudflare/get-started)
- [OpenNext environment variables](https://opennext.js.org/cloudflare/howtos/env-vars)
- [OpenNext Stripe guidance](https://opennext.js.org/cloudflare/howtos/stripeAPI)
- [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Clerk Next.js v6 migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/nextjs-v6)

## Next steps in order

1. **Resume from the work branch.** Read this file, inspect `git status`, fetch the organization repository, and compare the current branch with `main`. Preserve any newer user work. Do not recreate the starting upload.
2. **Confirm Cloudflare and backend access.** Verify the intended Cloudflare account and workers.dev subdomain. Check the original TRDE Supabase endpoint using a read-only request without retrieving private records. Resolve the project/account mismatch and missing secrets. Keep test billing distinct from real payments.
3. **Set up a reproducible build.** Resolve the local Node runtime, install dependencies, and select supported Next/OpenNext/React/Clerk versions together. Update package and lockfiles consistently. Do not skip type/build errors through blanket ignore settings.
4. **Finish and test authentication hardening.** Test signed-out API 401s, normal page redirects, forged identity-header rejection, valid browser sessions, mobile Bearer-token handling, admin authorization, and signed public webhooks. Replace remaining direct header-trust paths where needed.
5. **Repair trade persistence before calling the app usable.** Align validation and serialization with the actual UI/core/SQL contract. UI IDs are text, enums are uppercase, timestamps are epoch milliseconds, grades include plus/minus variants, regimes differ from the old schema validator, and attachments are objects with image URIs. Preserve valid numeric zeroes instead of converting them to null with `||`. Test futures, options, and EDGE save/read/edit roundtrips plus malformed-input rejection. The inspected SQL already supports these shapes; a database migration was not shown to be necessary.
6. **Address Workers runtime risks.** Configure Stripe's fetch transport and test webhook verification in Workers. Review the server bundle's `isomorphic-dompurify`/jsdom dependency, eager environment reads, Node crypto compatibility, and the CSP's Clerk domain allowlist. Remove credential/response-body logging from the ProjectX authentication client before enabling broker connections publicly.
7. **Add deployment configuration.** Add `apps/web/open-next.config.ts`, `apps/web/wrangler.jsonc`, build/preview/deploy scripts, static-asset handling, and documented Node compatibility settings. Ignore `.open-next`, `.wrangler`, and `.dev.vars`. Keep the monorepo workspace dependencies available during the build.
8. **Configure build and runtime environments securely.** `NEXT_PUBLIC_*` values must be present at build time; server secrets belong in the deployment's secret storage. Do not commit secret files. Configure only the resources needed for this application, and confirm any newly required paid plan before purchasing it.
9. **Verify locally before deployment.** Run type checks, a production Next build, the OpenNext build, and a Workers preview. Test page loading, sign-in, entitlement handling, a trade that survives refresh, editing, journal saving, and unauthorized API rejection. Add focused regression tests for repaired behavior.
10. **Publish and verify the live workers.dev site.** Configure Clerk/Stripe endpoints for the resulting URL, validate webhook delivery, and test core flows on the deployed host. A successful build or a visible landing page alone does not establish that authenticated saving works. Return the actual verified URL and any remaining limitations.
11. **Keep GitHub current.** Commit coherent changes to G42-Inc/TRDE, preserve unfinished work on a branch, and update this handoff with the deployed URL, validation results, current commit, and remaining tasks. Set up deployment from the organization repository once the initial build is working.

## Other known issues to retain in the backlog

These are source-review findings, not completed repairs:

- Manual futures P&L uses fixed tick assumptions across different instruments; options direction handling and some time-based analytics need validation.
- Empty cloud arrays do not reliably clear local caches, and deletion/conflict behavior needs work.
- Strategy versions, collections, saved filters, migration/delete actions, and some pre/post-trade or weekly-review workflows have disconnected UI or stubs.
- Weekly PDF export is a mock text-report flow; mobile exports display alerts rather than sharing files.
- Notification digest code does not actually send email; achievement triggering is only partly wired.
- The advertised Basic/Edge/Pro feature separation is not fully enforced in inspected routes.
- Mobile has a likely render-time use-before-initialization error for `syncFromCloud`, mismatched save payload keys, an unused offline queue-draining hook, and an undefined sync-status property. Its caches also need account-isolation review.
- App-store links are placeholders. Mobile does not have the full web EDGE/Flow/billing experience.

The first deployment objective is a usable web journal. Do not silently claim every legacy feature or mobile workflow is ready just because the web site is online.

## Prompt to resume in a new chat

> You are Z. Begin user-facing messages with Z: and give a huge, prominent warning before the chat approaches its context limit. Read docs/HANDOFF.md in G42-Inc/TRDE before continuing. Keep TRDE and subsequent changes in the G42-Inc organization. The starting baseline is already public; do not recreate it. Resume work/cloudflare-deployment, inspect current Git state, and preserve newer work. The goal is to make the existing TRDE web app usable on a Cloudflare workers.dev address. No live deployment has been verified. Two authentication files contain untested draft hardening; trade persistence, dependency/runtime migration, backend access, missing configuration, and deployment remain unfinished. Keep credentials private, validate the authenticated save/read/edit flows, publish coherent changes to GitHub, and return the verified live URL when complete. Update the handoff before a context rollover.
