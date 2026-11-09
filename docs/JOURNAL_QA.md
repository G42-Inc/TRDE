# Journal usability and functional audit

November 9, 2026. Verified production-preview audit on `work/cloudflare-deployment`; live rollout pending at this source checkpoint.

The audit uses marked Clerk test accounts with isolated synthetic trades and a separate localhost production Worker preview. The user's signed-in live account is inspected read-only. Neither real trades nor entitlements are changed. No external messages or real financial transactions are sent.

## Coverage and evidence

| Area | Changes under verification | Status |
| --- | --- | --- |
| Shared navigation | All journal destinations on mobile; compact header; short-screen sidebar scrolling; named controls; focus/Escape behavior; load/error recovery; scene contrast | Passed in production preview |
| Overview | No forced loading delay; immutable chart sorting; repaired strategy link; accessible task management restored | Passed in production preview |
| Trade list/timeline | Real collections, advanced/saved filters, links usable by keyboard, responsive controls, correct execution times/local dates and negative currency signs | Passed in production preview |
| Create/edit/details | Real strategy versions, labeled fields, mobile form spacing, save/upload busy states, missing-trade recovery, screenshot drafts/cancel/errors/preview, collection saves | Passed in production preview |
| Performance/Analytics | Functional EDGE filter, execution-based period/hour grouping, breakeven streak correction, responsive strategy cards and accessible metric/detail dialogs | Regression and browser checks passed |
| Journal | Awaited daily bias/quick journal saves and existing trade-journal/weekly-review API contracts; errors retained; local dates; duplicate-day normalization and zero confidence preservation | Regression, real authenticated API and browser checks passed |
| Review/Calendar | Real collections, collection creation, selected-day details and compact mobile calendar | Passed in production preview |
| Risk | Awaited rules/review saves, visible failures, latest review selection | Passed in production preview |
| Strategies | Private strategies saved to journal store, persisted versions/content, safe Explore search/error states | Regression, real authenticated API and browser checks passed |
| Settings | Actual sync/clear behavior, truthful errors, export quoting/instruments, comped billing state, validation errors | Real authenticated API, confirmation/isolation and browser export checks passed |
| EDGE | Disconnected chart guidance, explicit data errors, account-scoped local cache, simulation/export correctness | Offline simulation/queue/isolation tests and disconnected-state browser checks passed; provider data unavailable |

## Explicit limits

- ProjectX broker sync, live/history market retrieval and provider-backed chart replay require a working ProjectX account/API connection. The audit does not invent credentials or claim this integration has passed without them.
- Flow is still labeled Coming Soon in navigation. Its provider-backed operation is not certified by this journal audit.
- Clerk and Stripe retain development/test configuration. Existing verified login, owner isolation and test webhook behavior do not imply production billing has been activated or a real payment has been tested.
- Browser push subscription, actual notification delivery, feedback submission and external contact links are not exercised by sending messages or granting browser permissions during this audit.
- Responsive browser testing is not a claim of native mobile-app/device certification or field Core Web Vitals.

## Verified workflows

- All89 regression tests, web typecheck, production Next/OpenNext build, complete Worker secret scan and Wrangler dry-run passed. Compressed Worker is about2464KiB. Final small layout/label/time/link changes receive a targeted final preview check before rollout.
- All16 routes loaded their actual page heading at1280px: Overview, Trades, Timeline, New Trade, Journal, Review, Risk, Performance, Analytics, Glossary, Strategies, Explore, EDGE, EDGE Chart, EDGE Trades and Settings. The same routes were checked at320px. Chart minimum widths/control wrapping were corrected; Settings' final tab-rail width correction is included in the final package. Mobile create/edit flows were exercised at390px. This is browser viewport coverage, not exhaustive device/browser certification.
- Synthetic ES4000→4010 with one contract/$10 fees saved$490, survived hard reload, and retained$490 after a notes-only edit/reload. A synthetic short option5→6 with multiplier100/$10 fees saved-$110 with a newly created private strategy and version; loss filtering displayed-$110 correctly.
- Private strategy and version definition/triggers survived reload and appeared in the new-trade picker. Saved Loss filter restored both header and advanced controls. Collections created/assigned persisted. Quick note and daily bias with confidence0 persisted; calendar selection showed correct date, trades and notes. Screenshot caption save and Cancel behavior passed; full preview/Escape passed.
- Dated task persisted, appeared overdue, completed and survived reload. Inbox task link scrolled to the loaded task panel. CSV download contained6 synthetic trades with18 consistent columns; report preview/text download and native Escape passed. No passwords, subscriptions, browser permissions or personal files were changed during QA.
- Real authenticated APIs verified exact version metadata, owner409 isolation, zero/false/null roundtrips, duplicate bias dates, delete-one-of-two tasks, notification/preferences validation400, encrypted dummy-key save/read/edit/delete and isolation, complimentary subscription display, nine demo write guards403, clear confirmation400 and owner-only deletion200. Clearing QA B removed its13 journal-table datasets while preserving account/billing/preferences/connections and QA A's trades.
- QA B then signed into an empty Overview/Trades/Journal/Strategies/EDGE/Performance without seeing QA A's records. First-use Risk Rules with zero limits/false requirements saved and survived reload/edit. User-owned data and entitlements were not modified.
- Offline simulation checks cover long/short, slippage, zero fees, entry/exit fee allocation, partial closes/flips and settings changes. Export checks cover net result, execution date, unsupported contracts, deterministic duplicate prevention and account-switch protection. Queued save checks cover awaiting success, failure retention/retry and stale-account suppression.

Deployment source/version and final fixture cleanup will be added after live verification.
