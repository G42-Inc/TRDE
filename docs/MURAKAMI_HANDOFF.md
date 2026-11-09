# TRDE — Murakami build handoff

Prepared November 9, 2026. This is a continuation of an existing, deployed application. Read this first, then [HANDOFF.md](HANDOFF.md), [JOURNAL_QA.md](JOURNAL_QA.md) and [CLOUDFLARE.md](CLOUDFLARE.md). Those files contain the detailed evidence and operating instructions.

## Start here

| Item | Current checkpoint |
| --- | --- |
| Existing repository | [G42-Inc/TRDE](https://github.com/G42-Inc/TRDE) |
| Continue this branch | `work/cloudflare-deployment` |
| Open pull request | [PR #1](https://github.com/G42-Inc/TRDE/pull/1), not merged |
| Live website | https://trde.rr-seshify.workers.dev |
| Live journal | https://trde.rr-seshify.workers.dev/app |
| Deployed application source | `0e40907dabe07638ac351113df0a495060d962b0` |
| Last audit documentation commit before this handoff | `09d19659e44a6d7578b8017807c795eb5447ad96` |
| Deployed Worker version | `3067edb0-f14a-4b5b-88fb-93b5346204cb` |
| Original public baseline retained on main | `2d2db0818e3228e26b21cde3022ac74e82e214e1` |

The worktree was clean and matched the remote before this documentation change. Fetch and inspect the latest state: newer work may exist by the time you resume. Documentation commits after the deployed application source do not mean the app needs redeploying.

## User instructions that carry forward

- Begin user-facing messages with **`Z:`**.
- Give a large, prominent warning before the chat approaches its context limit. Update `docs/HANDOFF.md` before rollover. Do not invent a remaining-context percentage.
- Keep TRDE and subsequent GitHub changes in **G42-Inc**. Do not recreate the public baseline, move the repository or fork it into another owner.
- Preserve newer local/remote work. Do not hard-reset, force-push, merge PR #1 or replace the database as a shortcut.
- Keep credentials out of chat, source, screenshots and public logs. Use private configuration or the destination environment's secret store.
- The existing workers.dev deployment and selected resources were already authorized. Additional paid resources, real charges and production identity/billing activation are separate decisions; earlier approval covered the stated free resources and test configuration.
- Preserve the user's actual account, trades and entitlement. Their login works, but their account was in **demo mode** during read-only verification. Demo is intentionally read-only. Do not grant administrator access or silently change subscription/access status to make a test pass.

## What is already working

TRDE is a futures/options trading journal: record trades, write context and reviews, study performance, manage private strategies and review risk discipline.

- The original Next app now runs as a full-stack Cloudflare Worker. Clerk verifies identity; server APIs enforce ownership; Supabase persists journal data.
- Real authenticated save/read/edit/reload passed for futures, options and EDGE-shaped journal records. Fresh non-demo users with journal access can save without a strategy. Review-only edits preserve financial results and precise timestamps; zero fees/risk values survive.
- Private strategy/version content, collections, saved filters, screenshot captions, daily bias, quick notes, calendar details, tasks, risk rules, CSV/report export and Settings workflows were repaired and verified within the documented test scope.
- Desktop/mobile navigation, compact headers, scrollable menus, labels, focus/Escape dialogs, loading/error recovery and narrow layouts were improved. All 16 journal routes loaded without page overflow at 320px; mobile create/edit ran at 390px; desktop was checked at 1280px.
- Analytics uses execution order/hour, correct calendar weekdays and separate breakeven handling. Shared drawdown calculations do not reorder journal arrays. Metrics render actual values immediately, preserve decimal precision and respect reduced motion.
- The landing page's missing assets were repaired. Lightweight artwork and previews replaced heavy decoration. Initial modern JavaScript fell 26.4%, onboarding video 85.7%, and six scene images 65.6% by measured transfer/file size. These are not field Core Web Vitals claims.
- **93 regression tests**, web typecheck, production Next/OpenNext build, artifact secret scan and Wrangler dry-run passed. Nine acceptance groups using real Clerk sessions passed again on the final live Worker. Extended feature/Settings tests and browser flows are recorded in `JOURNAL_QA.md`.
- Earlier real provider-delivered Clerk and Stripe **test** webhooks and replay/idempotency cases passed. Hosted Checkout completion and real payments have not been certified.

There are no retained QA users to sign into. Exactly two marked accounts and three active sessions were removed; zero owned rows were verified across 30 tables. Temporary test state/scripts and deployment secret JSON were deleted. The local preview was stopped. Real user data was preserved.

## Remaining work and useful next steps

These are follow-up tasks, not claims that every integration is ready:

1. **Remove excess entitlement diagnostics.** `apps/web/src/lib/entitlements/check.server.ts` logs user identifiers and queries sample unrelated entitlement IDs for debugging. Remove unnecessary diagnostic queries/logs, then compare its policy with `src/lib/auth/entitlements.server.ts` before consolidating anything. Keep authorization behavior covered by focused tests.
2. **Make broad QA cleanup repeatable.** `apps/web/scripts/acceptance.mjs` checks account markers, but its built-in cleanup explicitly handles five tables and one recorded session per user. The previous 30-table/all-session cleanup was a temporary private script and is gone. Before new broad browser QA, create marker-verified cleanup covering every fixture-owned table and active session, with exact owner filters and post-cleanup verification. Never clear an actual user's account.
3. **Decide real-user access and production readiness.** Clerk and Stripe are still development/test instances. Confirm the intended early-access/paid-access policy, production Clerk configuration, domains/origins and webhook setup before changing them. Journal access is distinct from administrator privileges. Real checkout/subscription lifecycle testing remains separate work.
4. **Connect and validate ProjectX/EDGE.** Offline simulation, fees, account-scoped cache and queued export tests passed. Broker sync, provider history/market retrieval and provider-backed replay need a working authorized ProjectX connection. Do not invent credentials or report these as tested. The integration is read-only; no live order placement was identified.
5. **Scope Flow explicitly.** It remains disabled/Coming Soon. Provider-backed options-data functionality is not certified; do not simply enable the navigation item.
6. **Additional product validation.** Multi-device reconciliation, real notification delivery, public strategy posting/voting, feedback submission, hosted Checkout, broader browsers/devices and field performance remain outside the completed audit. The separate Expo app also needs its own dependency/sync/device work.
7. **Release automation if requested.** Deployment currently uses Wrangler from the work branch. GitHub-to-Cloudflare automatic builds are not configured. PR #1 remains open and main preserves the baseline.

Original backend recovery is a separate task. The old Supabase endpoint did not resolve; no historical records were migrated into the new database. Do not silently rewrite existing saved P&L as part of future calculation fixes.

## Repository and configuration map

| Location | Purpose |
| --- | --- |
| `apps/web` | Next App Router UI, APIs and server actions |
| `packages/core` | Trade contracts, analytics and metric explanations |
| `packages/mock-db` | Demo generators and filtering/export helpers; the real app is not all mock data |
| `apps/mobile` | Separate Expo/React Native companion |
| `apps/web/src/hooks/useAppData.ts` | Demo versus real data selection |
| `apps/web/src/contexts/StorageContext.tsx` | Account-scoped cache, cloud synchronization and queued writes |
| `apps/web/src/lib/storage.db.ts` | Browser-to-API persistence helpers |
| `apps/web/src/lib/validation/schemas.ts` | Validated journal payloads |
| `apps/web/src/lib/auth` and `src/middleware.ts` | Verified identity and authorization |
| `apps/web/src/lib/edge` | Provider integration, replay and simulation |
| `apps/web/supabase` | Existing schema/migrations; inspect the target database before applying changes |
| `apps/web/scripts/prepare-worker.mjs` | Mandatory generated-artifact secret guard |
| `apps/web/wrangler.jsonc` | Existing account, Worker, assets and self-reference binding |

The actual risk-rules table uses `user_id` as its sole primary key, with no `id` column. Preserve creation timestamps on edits. Private journal strategies and community strategies are separate stores. Do not undo these fixes to fit an assumed schema.

The existing Worker is `trde` in the selected rr.seshify Cloudflare account, serving `rr-seshify.workers.dev`. The existing Supabase project is **TRDE**, project `hfsuwgfkuqjtwgrrwqxs`, in **Goon42Studio's Org**, US East. The user approved that database destination at the quoted $0/month; GitHub stays in G42-Inc. Leave unrelated projects alone.

## Moving into Murakami

A repository clone does **not** include credentials, authenticated sessions or Wrangler OAuth. Connect the authorized GitHub/Cloudflare accounts in the destination environment as needed. Supply existing app configuration privately; do not paste secrets into the handoff or a chat.

On the original Mac, the workspace is `/Users/zanoni/Documents/ChatGPT/mac projects/TRDE`. Ignored `apps/web/.env.local` and `.dev.vars` retain private configuration with mode `0600`. If continuing on another machine, use a secure transfer/secret-store workflow. Do not assume those files or the original Mac's CLI login exist there.

Keep the existing `ENCRYPTION_KEY` and `API_KEY_ENCRYPTION_SECRET` for the existing database: replacing them makes stored encrypted credentials unreadable. `CLOUDFLARE.md` lists configuration names. The live Worker has 14 private runtime bindings, including webhook/retry secrets. Public `NEXT_PUBLIC_*` values are compiled into browser assets and require a rebuild when changed.

Use Node **24.22.1** and pnpm **11.25.0** to reproduce the validated environment; the repository supports Node >=22 and <25. Do not upgrade dependencies merely to resume.

For a fresh checkout only:

```sh
git clone --branch work/cloudflare-deployment https://github.com/G42-Inc/TRDE.git
cd TRDE
```

For either a fresh or existing checkout, inspect before updating files:

```sh
git status --short --branch
git fetch origin
git log -5 --oneline
git diff
pnpm install --frozen-lockfile
pnpm --filter web typecheck
pnpm --filter web test
```

After the private build/preview configuration is present:

```sh
pnpm --filter web build:worker
pnpm --filter web exec wrangler dev --port 8787
```

Stop that preview before rebuilding `.open-next`; serving overwritten chunks caused transient local chunk-loading errors during the previous audit. Use the packaged Worker for runtime acceptance, not only `next dev`.

## Deploying a later change

Follow `CLOUDFLARE.md`. Publish a coherent change to the existing G42-Inc branch, run relevant tests/typecheck/build, validate the packaged app and deploy the exact reviewed source. The final validated gzip was **2461.26 KiB**, below the free 3 MiB limit; recheck size after changes.

**Never deploy unguarded OpenNext output.** OpenNext copies dotenv into generated source. Run `scripts/prepare-worker.mjs` immediately before upload; it removes server values and scans the entire artifact. Runtime secrets belong in Worker bindings.

The established deployment command, from `apps/web`, is:

```sh
node scripts/prepare-worker.mjs
pnpm exec wrangler deploy --secrets-file /tmp/trde-worker-secrets.json
```

That temporary JSON must first be recreated privately from the intended configuration with mode `0600`; it is not in Git and no previous copy remains. Do not print it. Delete it after deployment. `--env-file` alone does not upload runtime secrets. Preserve the configured account, Worker name and matching self-reference binding.

Then verify the emitted live URL, authenticated save/read/edit/reload and account isolation using only marked synthetic fixtures. Record the exact application commit, Worker version, actual checks, limitations and completed cleanup in `docs/HANDOFF.md`. A successful landing-page request alone does not certify the journal.

## Paste into Murakami

> Continue the existing TRDE build in G42-Inc/TRDE on branch work/cloudflare-deployment. Read docs/MURAKAMI_HANDOFF.md, then docs/HANDOFF.md and docs/JOURNAL_QA.md before changing anything. Inspect Git state and preserve newer work. The existing app is live at https://trde.rr-seshify.workers.dev; do not recreate it or the public baseline. Begin user-facing messages with Z:, keep credentials private, and update the handoff before context rollover. First confirm the current source/configuration and summarize the remaining work. Continue the next agreed feature from this checkpoint, keeping all GitHub changes in G42-Inc and validating authenticated flows and desktop/mobile behavior before deployment.
