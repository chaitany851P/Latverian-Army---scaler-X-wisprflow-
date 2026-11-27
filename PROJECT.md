# VoiceKhata — Project Context

Voice-first multilingual bookkeeping, *khata* ledger, and inventory copilot for Indian small businesses (kirana stores, dairies, produce stalls, stationery, general stores, and mini-supermarkets).

## Tech Stack
* **Monorepo & Runtime:** Node.js 24 (`npm` workspaces), TypeScript 5.9, Zod 4
* **Frontend (`apps/web`):** Next.js 16 (App Router, `standalone`), React 19, Tailwind CSS v4, `next-intl`, Dexie (IndexedDB offline cache), `qrcode`, `lucide-react`
* **Backend & Worker (`apps/api`):** Fastify 5 (`@fastify/cors`, `@fastify/rate-limit`), `pg-boss` 12 (Postgres-backed cron/job queue), `@google/genai`
* **Database (`packages/db`):** PostgreSQL 16 (`pg_trgm` enabled), Drizzle ORM, `drizzle-kit`
* **Testing & CI:** Vitest 5, Playwright Test, ESLint 10 (`typescript-eslint`), GitHub Actions (`.github/workflows/ci.yml`)
* **Containerization (`infra/` & root compose):** Multi-stage Node 24 Alpine Dockerfiles, `docker-compose.yml`, `docker-compose.prod.yml`, Caddy 2 reverse proxy (auto-TLS)

## Directory Structure
* `plan/` — Team architecture & build specifications (`WORKFLOW.md`, `FEATURES.md`, `DATABASE.md`, `API_AND_VOICE.md`, `UI_UX.md`)
* `apps/web/` — Counter PWA client, offline IndexedDB queue, UPI QR utility, `next-intl` configuration
* `apps/api/` — Fastify HTTP API (`/healthz`, `/api/v1/health`), Gemini client factory, `pg-boss` worker stub
* `packages/shared/` — Shared Zod contracts (`TransactionDraftSchema`, `HealthResponseSchema`) and integer-paise / MRP-inclusive GST helpers
* `packages/db/` — Drizzle PostgreSQL schema and database pool helper
* `tests/` — Cross-layer Playwright E2E and golden voice regression JSON fixtures
* `infra/` — PostgreSQL init SQL (`pg_trgm`) and Caddy TLS reverse proxy config

## How to Run
* **One-command Windows launcher:** Double-click or run `start.bat` (builds shared libraries, launches API `:4000` + Web `:3000`, opens browser); run `stop.bat` to stop both cleanly
* **Manual local dev:** Copy `.env.example` to `.env`, run `npm install`, then `npm run dev:api` / `npm run dev:web`
* **Verification:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
* **Containerized (requires Docker Desktop):** `docker compose up --build`

## Implemented So Far
* Monorepo workspace scaffold, TypeScript base config, ESLint, Vitest, Playwright config, Dockerfiles, Compose files, and GitHub Actions CI workflow
* Shared integer-paise currency helpers (`rupeesToPaise`, `formatPaiseAsRupees`, `splitMrpInclusiveTax`) and Zod contracts
* Minimal Fastify `/healthz` + `/api/v1/health` endpoints and Next.js standalone shell

## Known Limitations / TODO
* Business tables (`products`, `inventory_batches`, `loose_bins`, `customers`, `invoices`, `ledger_entries`) pending in `feature/db-ledger-inventory`
* Docker Compose runtime execution not verified on this Windows host yet (Docker Desktop not installed locally)

## Recent Changes
* **2026-11-27:** Added Bill Generation preview (`BillPreviewDialog` with previous *udhaar* separation, UPI QR, receipt copy, and print) and upgraded Dexie offline queue (`version(2)`) to persist & display itemized contents, totals, `View Bill`, and `Load to Counter`.
* **2026-11-27:** Tightened `Fuse.js` matcher (`threshold: 0.28`, exact alias priority) to prevent false matches (`chana dal` -> `Basmati Rice`), added `Chana Dal`/`Moong Dal`/`Cooking Oil`/`Tea`/`Potato`, fixed walk-in cash default, added Gujarati `khataman` recognition, and guarded client hydration against browser-extension DOM attributes (`bis_skin_checked`).
* **2026-11-27:** Added 9-script Unicode Indic transliterator (`packages/shared/src/indic.ts`), inline spoken unit-price overrides, 10-language UI translations (`hi`, `gu`, `mr`, `pa`, `ta`, `te`, `ml`, `bn`, `kn`, `en`), and English translation preview on Draft Cards.
* **2026-11-27:** Added `start.bat` and `stop.bat` launchers in project root (`PROJECT.md`, `README.md`, `plan/WORKFLOW.md` updated).
* **2026-11-27:** Added open-source developer & human test bench tooling (`@fastify/swagger` + `@scalar/fastify-api-reference` at `/reference`, `fuse.js` Hinglish sandbox matcher, `shadcn/ui` Radix Tabs/Dialog primitives, browser Web Speech + RMS mic meter, dynamic UPI QR, and `Dexie.js` offline queue inspection UI).
* **2026-11-27:** Added `.github/workflows/docker-verify.yml` (Docker Buildx builds, non-root check, live Compose runtime smoke checks) and hardened API/Web Dockerfiles (`--chown=node:node`, `npm prune --omit=dev`).
* **2026-11-27:** Added team engineering documentation in `plan/` (`WORKFLOW.md`, `FEATURES.md`, `DATABASE.md`, `API_AND_VOICE.md`, `UI_UX.md`).
* **2026-11-27:** Scaffolded monorepo layout, Docker/Caddy/CI configs, installed workspace dependencies (`chore/dependencies`), and verified lint, typecheck, unit/API tests, build, and production audit.
