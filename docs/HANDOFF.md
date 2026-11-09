# TRDE deployment handoff

Updated by Z on November 8, 2026 (America/New_York).

**Live URL: https://trde.rr-seshify.workers.dev**

The existing web app is live and verified. Authenticated API persistence, provider webhooks and browser create/read/edit/reload passed. The final repair prevents background refresh from replacing an unsaved edit draft; immediate edit/save/reload passed on the deployed version.

## Preserve the user's instructions

- Begin user-facing messages with `Z:`.
- Give a huge, prominent warning before approaching the chat context limit. Update this handoff before rollover. Never invent a remaining-context percentage.
- Keep GitHub work in **G42-Inc/TRDE**. The public starting baseline already exists; do not recreate or relocate it.
- Work on `work/cloudflare-deployment`, inspect current Git state, and preserve newer local/remote changes.
- Deploy to a **workers.dev** address first, validate real authenticated saving/reading/editing, publish coherent GitHub commits, and return the verified live URL.
- Keep credentials out of chat, source, GitHub, screenshots, and public logs.

## Publication and deployment

| Item | Verified state |
| --- | --- |
| Repository | https://github.com/G42-Inc/TRDE |
| Pull request | https://github.com/G42-Inc/TRDE/pull/1 |
| Work branch | `work/cloudflare-deployment` |
| Original baseline, retained on main | `2d2db0818e3228e26b21cde3022ac74e82e214e1` |
| Main migration checkpoint | `430e6570c702d356ead9a78fabfc46eba2a8b1ed` |
| First-trade/local-date correction | `7b8573d73a3d567116daae6eff7553d2ae8f89f8` |
| Calculations and webhook replay checkpoint | `d3040c54c72ab9abe0f56b36ae91ba91301f2be8` |
| Final application source checkpoint | `7178054f0415c159cf7cc361c66b883ea930a8e7` |
| Latest Worker version | `5794e405-0cce-458c-ad73-00c480276bb9` |
| Live host | https://trde.rr-seshify.workers.dev |

GitHub connector published exact staged trees, verified against local Git tree hashes before updating branch refs. No force-push or baseline recreation occurred. Final verification documentation may add a later docs-only commit; use `git log` for current HEAD.

## Approved resources and access

The user explicitly selected Cloudflare **rr.seshify@gmail.com**, account `1fec521799391320a7bc672fcda76230`, subdomain `rr-seshify.workers.dev`, Worker `trde`. They approved official Wrangler OAuth user/account read, Workers/scripts write, tail read and background access. Authentication completed and is restricted to the selected account. Do not ask again for these already approved scopes. No paid Cloudflare upgrade was needed; final compressed bundle is about 2,440 KiB, under the free 3 MiB limit.

The original configured Supabase hostname failed DNS. The user approved creating a new **TRDE** project in **Goon42Studio's Org** (`cdebakursthuoavxatqj`) in US East (`us-east-1`) at the quoted **$0/month**. Project `hfsuwgfkuqjtwgrrwqxs` is healthy at `https://hfsuwgfkuqjtwgrrwqxs.supabase.co`. This explicit Supabase destination is separate from GitHub's G42-Inc requirement. No old trading/user records were migrated. The four unrelated inactive Supabase projects were not modified.

Clerk and Stripe retain the existing **development/test** configuration. No production billing credentials, real charges, or paid subscriptions were enabled. New Clerk/Stripe webhook endpoints were added for the live host; no existing endpoints were replaced/deleted.

## Completed implementation

- Web runtime pinned to Next 15.5.29, React/DOM 19.3.1, Clerk 6.39.8, OpenNext 1.20.16 and Wrangler 4.158.0. Graphics/UI peers updated. Panels pinned to 4.3.0 for Next 15 compatibility. Node 24.22.1 and pnpm 11.25.0 recorded with lockfile. Mobile manifests unchanged.
- Verified Clerk sessions/metadata replace unsigned identity headers, decoded JWT payloads and admin cookies. Mobile Bearer verification, signed public webhooks, API 401/page redirects and fail-closed retry authorization are covered.
- Trades use actual core/UI contracts (uppercase enums, text IDs, epoch timestamps, grades, attachments, zero values). All global-ID data writes use ownership-safe insert/update; related journals/versions validate owner references. Explicit deletion avoids wiping cloud data from empty caches. Save failures reach forms, successful empty fetches clear caches, and account changes invalidate stale requests.
- Fresh accounts can save/edit with **No strategy**. Forms use local calendar defaults and functional field updates. The edit form loads one owned snapshot per account/trade, hides inputs until ready, retains the original calculation baseline, and cancels stale loads. Background cache/cloud replacement no longer overwrites unsaved typing. Load failures offer Retry/Back; demo trades remain read-only.
- Shared calculations use verified contract tick size/value for 12 common futures, with visible custom tick fields for other symbols. Options honor long/short, fees, planned risk and multiplier. Zero fees/risk are preserved. Review-only edits retain original P&L and precise/overnight timestamps; fee/risk changes adjust only the relevant calculations. **No existing saved financial records are automatically migrated.**
- Stripe uses fetch and asynchronous Web Crypto signature verification. Config and encryption keys resolve lazily. The jsdom dependency and ProjectX credential/response logging were removed. CSP supports configured Clerk domains.
- Stripe failed-event replay now retries, clears failure on success and deduplicates successful events; retry payloads support current and legacy shapes. Clerk user.created initializes missing rows only, preserving paid access, preferences, XP and newer profile data on replay.
- Canonical database bootstrap/precision patch created and applied. 34 tables have RLS; anon/authenticated have no app table/view privileges or executable app functions. API enforces Clerk ownership using a private server key. Ownership is immutable; functions/views use invoker rights. JSONB journals and separate community/private strategy tables align with API code. 46 static achievement definitions, no user/admin seeds. Security advisor clean.
- OpenNext/Wrangler/static headers and documented deployment commands added. See `docs/CLOUDFLARE.md` for operational detail.

## Verification evidence

- 49 focused regression tests pass. Web typecheck, production Next build and full OpenNext build pass without blanket type/build ignores. Final artifact guard and Wrangler dry run pass.
- The secret guard removes server-only dotenv values from generated OpenNext configuration and scans the **entire** Worker output for configured private values. No matches remain. Cloudflare's 14 runtime bindings verified as `secret_text`.
- New database read-only checks: server access 200; public key denied 401. Rollback-contained SQL tests cover trade/journal create/read/edit, fractional tick/price precision, ownership rejection and engagement functions. No SQL fixture records retained.
- Nine real Clerk-token acceptance groups pass against the live Worker and dedicated Supabase, with no auth mocks: unauthorized/invalid/forged-header 401, real account access/admin spoof rejection, futures/options/EDGE exact create/read/edit, malformed 400, cross-user isolation/edit 409/deletion protection, journal save/read/edit and foreign reference rejection, todo takeover 409, migration roundtrip/isolation, demo writes 403.
- Browser: actual sign-in via isolated test email/code, dashboard/cloud records, first trade without strategy, correct local date, create→hard reload→edit→hard reload persistence verified. Final corrected ES example and review-only preservation checks: Passed on version `f41c9a33-ff74-4a5a-aea6-4e79e7275893`: ES 4000→4010, quantity 1, fees $10 saved as $490; notes-only edit retained $490; fees $0 changed it to $500. Each survived reload. Sign-out returned to landing. Final version `5794e405-0cce-458c-ad73-00c480276bb9` also passed immediate editor initialization→notes edit→save→reload with the correct $500 preserved, followed by sign-out.
- Actual provider-delivered Clerk create/update/delete webhooks each succeeded HTTP 200, with profile changes persisted. Stripe TEST subscription create/payment/cancel events were acknowledged with successful audit rows and active→canceled entitlements. Separate provider fixtures were canceled/deleted. No emails or real charges.
- Live Stripe invalid signature 400, failed-event redelivery recovery 200, duplicate idempotency 200 verified; synthetic audit fixture removed.
- Final live Clerk replay preservation: Passed on version `f41c9a33-ff74-4a5a-aea6-4e79e7275893`: all four evolved rows retained exactly; legitimate profile updates worked. Synthetic replay records removed.

## Private configuration and deployment

`apps/web/.env.local` and `.dev.vars` are ignored, mode 0600. They hold the new Supabase public/server keys, retained Clerk/Stripe test config, fresh independent encryption keys for this new database, retry key, and the new webhook signing secrets. Keep them synchronized for preview. Do not replace encryption keys after encrypted data exists.

Runtime Node is at `/Users/zanoni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`; prepend this to PATH to use the available pnpm wrapper. Network/build/listen operations may need sandbox escalation. Git publishing works through the connected GitHub tools; public fetch works with network access.

**Never upload an unguarded OpenNext build.** The adapter copies local dotenv values into `.open-next/cloudflare/next-env.mjs`. `scripts/prepare-worker.mjs` removes all non-NEXT_PUBLIC values and scans all generated files. Canonical package build/preview/deploy scripts run it. Production secrets must be Worker bindings, not generated source. Public configuration changes require a rebuild.

Deployment from `apps/web` used:

```sh
pnpm run build:worker
node scripts/prepare-worker.mjs
pnpm exec wrangler deploy --secrets-file /tmp/trde-worker-secrets.json
```

The temporary JSON was mode 0600, never printed. `--secrets-file` uploads bindings atomically with the version; `--env-file` alone does not. Recreate a protected JSON from the local environment when needed. Keep `account_id`, Worker name and self-reference binding aligned. Do not purchase/enable a paid plan without user approval.

Clerk endpoint: `/api/clerk/webhook`, user.created/updated/deleted. Stripe TEST endpoint: `/api/billing/webhook`, six handled events, version 2024-11-20.acacia. Existing prices are active USD monthly test prices of $9.99/$14.99/$19.99. Hosted Checkout browser/payment completion was not exercised; actual provider-driven subscription synchronization was.

## Acceptance fixtures and cleanup

The opt-in script `apps/web/scripts/acceptance.mjs` creates only marked Clerk test users and comped fixtures, never impersonates existing users or prints JWTs. Addresses use +clerk_test. Private fixture state is written to `/tmp/trde-e2e-acceptance.json` only while a test run is active. Reuse verifies matching private metadata; cleanup revokes sessions and removes only marked users/records.

Final fixture cleanup passed: exactly two marked Clerk acceptance accounts removed, active sessions revoked, and zero owned records remaining across 30 user-data tables, including browser-created trades. Both deleted accounts return 404. The private fixture-state file was removed. The local preview processes started for this task were stopped. The user's ignored private configuration files are retained. The temporary deployment secret JSON was removed after final deployment.

## Remaining scope limits

- This is a verified web journal deployment with a **fresh database and test-mode identity/billing**. Production promotion, original-data recovery/migration and real-money checkout require separate work.
- Legacy EDGE importer/simulator fallback contract metadata was not broadly refactored. Unsupported manual instruments require explicit tick specifications. Existing older saved calculation mistakes are not silently rewritten.
- Mobile is not validated; optional native peer warnings and known mobile sync issues remain. Flow stays disabled/Coming Soon. Several legacy collections/version/review/export/notification/entitlement features remain incomplete; do not claim full product readiness from web deployment.
- Hosting was deployed with Wrangler from the organization work branch. Automatic GitHub→Cloudflare build integration is not configured. The source is reviewable in PR #1; main preserves the baseline until merge.


## What TRDE is

TRDE is a trading journal and performance-improvement workspace for futures and options traders. Its central workflow is to record trades, capture market context and emotions, study results, refine strategies, and review discipline and risk.

The web app now has authenticated APIs, a database and external integrations. Several historical completion checklists describe features that are disconnected or incomplete. Use the current code and verification evidence as the source of truth.

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

- `apps/web`: Next.js App Router application and API/server-action backend. The deployed web app uses Next.js 15, React 19, TypeScript and Tailwind through OpenNext.
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
- `apps/web/src/lib/validation/schemas.ts` and `src/app/api/data/trades/route.ts`: validated trade save contracts.
- `apps/web/src/middleware.ts` and `src/lib/auth/clerk.ts`: verified Clerk authentication and authorization.
- `apps/web/src/lib/env.server.ts`: lazy server configuration validation.
- `apps/web/src/lib/edge`: ProjectX integration, replay/simulation, chart logic, and imports.
- `apps/mobile/src/contexts/StorageContext.tsx`: mobile startup and synchronization issues.

Web persistence currently mixes a user-scoped local cache with Supabase-backed API calls. Trades save immediately after local state is updated; many other data types use a debounce. EDGE has additional browser-local storage. This is not yet a fully validated multi-device reconciliation system.



## Resume guidance

Inspect Git/this handoff first, preserve newer work, and use the current deployed version/PR state. This deployment task is complete, including fixture cleanup. Treat the listed scope limits as future work; do not repeat completed migrations or recreate the baseline. Keep credentials private and all GitHub changes in G42-Inc.
