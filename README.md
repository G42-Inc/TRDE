# TRDE - Trading Journal Monorepo

A frontend-only prototype trading journal for futures and options traders.

## Structure

- `apps/web` - Next.js web application
- `apps/mobile` - Expo React Native mobile application
- `packages/core` - Shared types, analytics, and business logic
- `packages/ui-tokens` - Design tokens
- `packages/mock-db` - Mock data and persistence helpers

## Getting Started

```bash
# Install dependencies
pnpm install

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

This is a frontend-only prototype using localStorage (web) and AsyncStorage (mobile). No backend, auth, or external APIs.
