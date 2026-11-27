# VoiceKhata

Voice-first multilingual bookkeeping, *khata* ledger, and inventory copilot for Indian small businesses.

## Team Planning Docs

See [`plan/README.md`](./plan/README.md) for development workflow, database ERD/schema, voice & API contracts, feature cutlines, and UI/UX specs.

## Workspace Layout

* `apps/web` — Next.js PWA counter client (`Dexie` offline store, `next-intl` i18n, dynamic UPI QR)
* `apps/api` — Fastify API server + `pg-boss` background cron/job worker
* `packages/shared` — Shared `Zod` contracts & integer-paise financial math
* `packages/db` — Drizzle ORM PostgreSQL schema (`pg_trgm` enabled)
* `tests/` — Cross-layer integration, Playwright E2E, and voice regression fixtures
* `infra/` — PostgreSQL init SQL and Caddy automatic HTTPS reverse proxy

## Local Development

```bash
cp .env.example .env
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

## Containerized Stack

```bash
docker compose up --build
```
