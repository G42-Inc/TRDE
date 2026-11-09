# TRDE - Trading Journal Monorepo

A trading journal for futures and options traders, with a Next.js web app, Clerk authentication, Supabase persistence, and an Expo mobile companion.

**Live web app: [trde.rr-seshify.workers.dev](https://trde.rr-seshify.workers.dev)**

The Workers deployment uses a fresh database and development/test-mode Clerk and Stripe configuration. See [deployment instructions](docs/CLOUDFLARE.md) and the [current handoff](docs/HANDOFF.md) for verified behavior, configuration, and remaining scope.

## Structure

- `apps/web` - Next.js web application
- `apps/mobile` - Expo React Native mobile application
- `packages/core` - Shared types, analytics, and business logic
- `packages/ui-tokens` - Design tokens
- `packages/mock-db` - Mock data and persistence helpers

## Getting Started

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run web app
pnpm dev:web

# Run mobile app
pnpm dev:mobile
```

## Features

- Trade tracking (Futures & Options)
- Analytics dashboard with explainers
- Journaling workflow
- Weekly reviews
- Risk management
- Collections and saved filters
- Export capabilities (CSV, PDF mock)

## Note

Web trade and journal save/read/edit flows are verified on Cloudflare Workers. Browser caches supplement server persistence. Mobile and the broader legacy feature set are not covered by this deployment verification; Flow remains disabled. Keep private configuration in ignored local environment files and Cloudflare secret bindings. Use the Node and pnpm versions pinned in the repository.
