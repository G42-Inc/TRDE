# TRDE project and deployment handoff

Updated by Z on November 8, 2026 (America/New_York). **No live deployment has been verified yet.**

## User instructions

- Begin user-facing messages with `Z:`.
- Give a huge, prominent context-limit warning before rollover, and update this handoff first. Do not invent a remaining-context percentage.
- Keep all GitHub work in **[G42-Inc/TRDE](https://github.com/G42-Inc/TRDE)**. The public starting baseline already exists; do not recreate or relocate it.
- Resume `work/cloudflare-deployment`; inspect Git status/remote before changes and preserve newer work.
- Make the existing web app usable at a Cloudflare **workers.dev** address. Validate real authenticated save/read/edit, publish coherent commits, and return the verified live URL.
- Keep credentials out of chat, GitHub, screenshots, published source, and public logs.

## Current authoritative status

The original published baseline is `2d2db0818e3228e26b21cde3022ac74e82e214e1`. This continuation began at `68509e298f5fa1c78cc71da893ce0c1abc85520c` with a clean working tree and matching organization remote. Use `git log` for the latest checkpoint; substantial changes are now ready to publish on the work branch.

### Confirmed resource decisions and authorization

- User selected Cloudflare **rr.seshify@gmail.com**, account `1fec521799391320a7bc672fcda76230`. Dashboard workers.dev subdomain: `rr-seshify.workers.dev`. Worker name/config: `trde`. **Expected** URL `https://trde.rr-seshify.workers.dev` is not a deployment verification.
- User explicitly approved official Wrangler OAuth access: user/account read, Workers write, scripts write, tail read, background access. OAuth completed and `wrangler whoami` confirms only the chosen account. Credentials remain in Wrangler's private local configuration. Do not ask again for these approved scopes.
- Original Supabase hostname fails DNS. User approved a **new dedicated TRDE** project in **Goon42Studio's Org** (`cdebakursthuoavxatqj`) at the quoted **$0/month**, US East (`us-east-1`). This is separate from the GitHub G42-Inc organization requirement.
- New Supabase project `hfsuwgfkuqjtwgrrwqxs`, URL `https://hfsuwgfkuqjtwgrrwqxs.supabase.co`, is healthy. No old user/trading records were migrated. Do not use the four unrelated inactive projects.
- Existing Clerk and Stripe credentials are **test/development mode**, retained from the original ignored configuration. Clerk key verified via a read-only API request. Do not claim production identity/billing readiness.

### Completed code and database work

- Upgraded web to Next **15.5.29**, React/DOM **19.3.1**, Clerk **6.39.8**, OpenNext **1.20.16**, Wrangler **4.158.0**; related graphics/UI packages updated. `react-resizable-panels` pinned **4.3.0** because newer releases use React.Activity absent in Next15's vendored runtime. Node **24.22.1**, pnpm **11.25.0**. Mobile manifests unchanged; optional native peer warnings remain and mobile is not validated.
- All direct identity-header, unsigned JWT, and unsigned admin-cookie authorization removed. Clerk verified sessions/metadata are authoritative. Signed-out APIs return401, pages redirect, mobile Bearer tokens are verified; Clerk webhooks verify raw bytes and retry auth fails closed.
- Trades now match core/UI shape: uppercase assets/direction, text IDs, epoch timestamps, grades/regimes, attachment objects, valid numeric zeroes. Owner-scoped insert/update prevents ID takeover. Explicit deletions replace whole-cache deletion semantics. Save errors reach forms; caches distinguish failed cloud fetch from successful empty data and isolate account changes.
- Other global-ID data writes and migration use owner-safe helpers. Journals/strategy versions validate related ownership. Journal saves await server confirmation; request payload names fixed.
- Workers runtime uses lazy config, Stripe fetch transport, async Web Crypto signatures, no jsdom/isomorphic-dompurify, and no ProjectX credential/response logging. CSP includes configured Clerk host. React19/build errors repaired without blanket ignores.
- OpenNext/Wrangler/static header configuration added. **OpenNext copies local dotenv secrets into generated server code by default.** `apps/web/scripts/prepare-worker.mjs` removes all nonpublic dotenv values from generated `cloudflare/next-env.mjs` and scans the entire output for configured private values. Canonical build/preview/deploy scripts run this guard. Always run it immediately before any direct upload. Production secrets belong in Worker bindings, never source.
- Canonical new-project SQL: `apps/web/supabase/bootstrap.sql`, plus `patches/precise-instrument-prices.sql`. Applied as migrations `trde_server_only_baseline` and `trde_precise_instrument_prices`. 34 tables all have RLS; anon/authenticated have no table/view grants or executable app functions. Ownership is immutable; functions/views use invoker rights. Private/community strategy models separated; journals use expected JSONB. 46 static achievement definitions only, no real user seeds. Security advisor clean; unused-index INFO notices expected on fresh database.

### Private local configuration

`apps/web/.env.local` is ignored and mode0600. It now contains the new Supabase publishable/server keys, retained Clerk/Stripe test config, freshly generated encryption keys for this new empty database, retry key, and newly provisioned webhook secrets. Do not rotate encryption keys later if stored encrypted records exist.

- Clerk endpoint enabled at expected URL + `/api/clerk/webhook`, subscribed to user.created/user.updated/user.deleted. `CLERK_WEBHOOK_SECRET` saved privately. There were no existing webhook endpoints; none were replaced.
- Stripe TEST endpoint enabled at expected URL + `/api/billing/webhook`, six handled events, API version2024-11-20.acacia. New `STRIPE_WEBHOOK_SECRET` saved privately. Three configured prices verified active USD monthly test prices ($9.99/$14.99/$19.99). No prior endpoints changed.
- **Keep `.dev.vars` synchronized with `.env.local` before local Worker testing**, especially after webhook secrets were added. Keep both ignored/mode0600. Public variable changes require a fresh build.
- Runtime Node path: `/Users/zanoni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`; pnpm wrapper already on PATH but needs Node prepended. Network/build/listen operations may require sandbox escalation. GitHub connector works for publication; public git fetch works with network access.
- Wrangler supports `deploy --secrets-file <JSON file>` to upload runtime secrets atomically with a version. Use an ignored mode0600 JSON file or private temp path, avoid values in command arguments. `--env-file` alone does not upload secrets.

### Verification already passed

- Web typecheck and production Next build, full OpenNext build, Wrangler dry run.
- Initial gzip Worker size2440.68KiB (below free3MiB limit), largest asset9.7MB. Recheck final deployment artifact after remaining changes.
- Complete generated Worker scan after guard: no configured private secret matches.
- 29 focused tests at checkpoint: auth signatures/admin/headers, ownership/races, trade contracts/storage, runtime. New guard and billing tests may increase count; rerun all before publication.
- Live SQL rollback-contained create/read/edit, attachments/zeroes, journal JSONB, immutable ownership rejection, XP/streak functions, fractional instrument price/tick precision. Test SQL records rolled back.
- Local real Worker at `http://localhost:8787` returned landing200, signed-out/forged-header API401, protected-page307, invalid Stripe signature400.
- **Real Clerk session tokens + new Supabase, no mocked auth** passed nine acceptance groups against local Worker: authorized trade/journal create/read/edit (futures/options/EDGE), zeros/attachments, invalid payload400, foreign write409/read isolation/delete no-op, related journal protection, todo takeover409, demo save403, admin spoof rejection, migration roundtrip/cross-owner rejection.
- `apps/web/scripts/acceptance.mjs` is opt-in, uses two marked isolated Clerk test users and comped Pro fixtures. It never impersonates existing users or prints JWTs. Temporary fixture state retained at `/tmp/trde-e2e-acceptance.json` (mode0600) for live rerun/browser QA. Fixed Clerk test email code424242; emails use +clerk_test@example.com. Cleanup verifies metadata ownership and revokes sessions before deleting only fixtures.

## Work remaining (in order)

1. Finish targeted Stripe retry reliability repairs currently in progress: previously failed event IDs were treated as completed, and retry payload shape differed. Runtime agent owns repair/tests; update `docs/CLOUDFLARE.md` to reflect actual final state.
2. Synchronize local runtime env, rerun test suite/typecheck, build+guard final artifact. Verify public and server deploy outputs contain no configured private values.
3. Publish coherent changes to G42-Inc/TRDE work branch using GitHub connector (baseline remains on main). Fetch before moving ref; preserve newer remote changes. Avoid committing environment files/builds/private fixtures.
4. Deploy guarded artifact to selected account using Wrangler with private secret JSON. No paid upgrade authorized or expected; stop if a paid plan becomes necessary. Record actual deployment URL/version.
5. Rerun real acceptance script with `TRDE_ACCEPTANCE_TESTS=1 TRDE_ACCEPTANCE_REUSE=1 TRDE_ACCEPTANCE_KEEP_FIXTURES=1 TRDE_ACCEPTANCE_STATE_FILE=/tmp/trde-e2e-acceptance.json TRDE_ACCEPTANCE_BASE_URL=<actual live URL>` and `node --env-file=.env.local scripts/acceptance.mjs` from apps/web. Perform browser sign-in/save/reload/edit, not only backend requests.
6. Verify Clerk/Stripe signed webhook delivery at actual host and test-mode checkout access. Existing actual account entitlements were not migrated; no real-money billing verified.
7. Update this handoff/deployment doc with verified live URL, version/commit, final tests, and concrete remaining limitations; publish final coherent follow-up. Clean only marked isolated acceptance fixtures when browser QA done.

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


## Resume prompt

Read this entire handoff first. Continue the existing work branch, preserve local/remote newer work, keep credentials private and GitHub under G42-Inc. Begin responses Z:, warn prominently before context rollover, finish verified workers.dev deployment and authenticated browser/API persistence. Do not call a build or guessed URL a live deployment.
