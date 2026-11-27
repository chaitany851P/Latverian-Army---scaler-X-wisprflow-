# Development Workflow & Engineering Rules

## 1. Git Branching & Merge Flow

```text
feature/backend  ──┐
feature/frontend ──┼──► integration (CI + E2E gate) ──► main (always deployable)
test/e2e-suite   ──┘
```

### Hard Rules
1. **Never commit directly to `main`.** `main` must always build (`npm run build`), lint (`npm run lint`), typecheck (`npm run typecheck`), and pass tests (`npm test`).
2. **Pull/sync before starting work:**
   ```bash
   git fetch origin
   git checkout feature/backend   # or feature/frontend, test/e2e-suite
   git rebase origin/main         # only before pushing shared commits
   ```
3. **Commit conventions (Conventional Commits):**
   * `feat(api): add atomic invoice commit endpoint`
   * `feat(db): add inventory_batches FEFO table`
   * `feat(web): build parallel hold-cart counter tabs`
   * `test(e2e): add split udhaar checkout flow`
   * `fix(voice): handle dedh and pao quantity units`
4. **Tests travel with code:** Unit and route tests live inside `feature/backend` and `feature/frontend`. `test/e2e-suite` adds cross-layer Playwright E2E, concurrent stock race tests, and golden Hinglish voice evals on `integration`.
5. **Merge cadence:** Merge completed vertical slices into `integration` frequently, run full verification, then merge `integration -> main` (`--no-ff`) so `main` never lags days behind.

---

## 2. Backend <-> Frontend Contract Rule (Zero Drift)

All shared DTOs, enums, and financial helpers live in `packages/shared/src/`:
1. **Define or update the Zod schema in `packages/shared` first** (`contracts.ts`).
2. **Run `npm run build:libs`** so `packages/shared/dist` and `packages/db/dist` emit updated `.d.ts` files.
3. **Backend (`apps/api`)** validates incoming requests and outgoing payloads against those exact Zod schemas.
4. **Frontend (`apps/web`)** imports those exact types and formats currency exclusively with `formatPaiseAsRupees()`—never duplicate DTO interfaces or floating-point rupee math in React components.

---

## 3. Local Development Setup

### Prerequisites
* **Node.js >= 24.0.0** and **npm >= 11.0.0**
* **PostgreSQL 16** with `pg_trgm` enabled (via Docker Compose or hosted Postgres such as Neon/Supabase)

### Native Node Dev (Fastest on Windows without Docker)
```bash
cp .env.example .env            # Fill DATABASE_URL, SARVAM_API_KEY, GEMINI_API_KEY
npm install
npm run build:libs              # Builds @voicekhata/shared and @voicekhata/db
npm run dev:api                 # Starts Fastify on http://localhost:4000
npm run dev:worker              # Starts pg-boss background job worker
npm run dev:web                 # Starts Next.js PWA on http://localhost:3000
```

### Containerized Stack (Local Docker / Staging)
```bash
docker compose up --build
```
* Production deployments **must** use `docker-compose.prod.yml` behind Caddy (`infra/caddy/Caddyfile`) because mobile Chrome/Safari blocks microphone capture (`getUserMedia`) and PWA service workers over non-HTTPS origins.

---

## 4. Verification Gate (Required Before Any PR to `integration` or `main`)

Run in order from the repo root (mirrored in `.github/workflows/ci.yml` and `.github/workflows/docker-verify.yml`):
```bash
npm run lint        # ESLint across all workspaces
npm run typecheck   # Rebuilds libs + tsc --noEmit across shared, db, api, web
npm test            # Vitest unit, paise/FEFO invariant, and Fastify API tests
npm run build       # Full production build (tsc + Next.js standalone)
```

### Feature Definition of Done
* [ ] Contract in `packages/shared` matches both API route and UI caller.
* [ ] Happy path, invalid/negative input, boundary values (zero, split payments, partial stock), and error states tested.
* [ ] Financial state changes use integer paise (`BIGINT`), append-only `ledger_entries`, and an `idempotency_key`.
* [ ] `PROJECT.md` updated with any new schema, endpoint, or dependency.
