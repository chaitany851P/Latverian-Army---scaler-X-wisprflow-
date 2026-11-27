# VoiceKhata — Team Plan & Architecture Index

Reference documentation for building, testing, and shipping **VoiceKhata** across `feature/backend`, `feature/frontend`, `test/e2e-suite`, `integration`, and `main`.

## Documents in This Folder

| File | Audience | Contents |
| :--- | :--- | :--- |
| [WORKFLOW.md](./WORKFLOW.md) | All Developers | Git branching, merge gates, local/Docker setup, contract-sync rules, Definition of Done |
| [FEATURES.md](./FEATURES.md) | Product + Full Stack | MVP vs. V2 scope cutline, 6 store presets, voice flows, dual expiry, deferred WhatsApp scope |
| [DATABASE.md](./DATABASE.md) | Backend / DB | PostgreSQL 16 + Drizzle schema, ERD, integer-paise/UoM rules, FEFO batches, append-only *khata* |
| [API_AND_VOICE.md](./API_AND_VOICE.md) | Backend + Voice + Frontend | Code-mixed ASR -> `pg_trgm` -> Gemini Draft pipeline, parameterized Q&A, REST API contracts |
| [UI_UX.md](./UI_UX.md) | Frontend / Design | Counter-first PWA layout, hold carts, Draft Cards, privacy masking, offline `Dexie.js` states |

## Team Branch Ownership
* **`feature/backend`** -> `packages/db/`, `packages/shared/`, `apps/api/` (+ unit/API tests)
* **`feature/frontend`** -> `apps/web/` (+ component/offline tests)
* **`test/e2e-suite`** -> `tests/e2e/`, `tests/integration/`, `tests/voice-evals/`
* **`integration`** -> Pre-release integration & CI verification branch
* **`main`** -> Always-deployable baseline (merges from `integration` or verified `docs/*`/`hotfix/*`)
