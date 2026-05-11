# AGENTS.md

## Setup And Commands
- Use `npm ci`. The repo is locked with `package-lock.json`.
- Core scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run test`.
- There is no `typecheck` script; use `npx tsc --noEmit` when TypeScript validation matters.
- Run one test file with `npx vitest run tests/<path>.test.ts`.
- Drizzle commands: `npm run db:generate` updates SQL in `drizzle/` from `lib/db/schema.ts`; `npm run db:migrate` applies migrations.
- Seed or reset a Supabase password user with `npm run auth:seed-user -- --email user@example.com` and optional `--password ...`.

## App Boundaries
- This is a single-package Next.js App Router app, not a monorepo.
- Main UI routes live under `app/(protected)` and `app/(auth)`.
- HTTP handlers live in `app/api/**` plus `app/auth/callback/route.ts`.
- Core server logic is concentrated in `lib/auth`, `lib/db`, `lib/persistence`, `lib/generation`, and `lib/media`.

## Verified Gotchas
- Auth is split across Supabase Auth and local Postgres access tables. A valid Supabase login is not enough by itself.
- First-login bootstrap depends on `SUPER_ADMIN_EMAILS`: matching emails are promoted to local `super_admin` in `lib/auth/access-repository.ts`. Without a local access record, users are blocked with `account_not_provisioned`.
- Generated and saved assets are stored on disk, not in object storage. `lib/media/storage.ts` writes under `MEDIA_STORAGE_DIR/<user>/runs/<run>/outputs/...`.
- Because the app uses filesystem access and Postgres directly, the API routes are explicitly `runtime = 'nodejs'`. Do not convert these handlers to Edge/serverless-style code casually.
- `README.md` is accurate here: this app is not a pure serverless deployment while `MEDIA_STORAGE_DIR` is in use.

## Data And Migrations
- Drizzle schema source is `lib/db/schema.ts`.
- Checked-in SQL migrations live in `drizzle/`; keep them in sync with schema changes.
- Database access is via `lib/db/client.ts`, which requires `DATABASE_URL` and uses a singleton `postgres` client.

## Testing Notes
- Vitest runs in `node` environment (`vitest.config.ts`).
- Tests usually import route handlers or library functions directly and mock DB, Supabase, and `node:fs/promises`; most test work does not require live services.
- Route and deployment behavior around writable media storage is covered by `tests/routes/health-route.test.ts`.

## Environment Signals
- Required envs are documented in `.env.example`.
- `/api/health` only reports `ok` when `DATABASE_URL` is set, `MEDIA_STORAGE_DIR` exists and is writable, and Supabase URL plus anon key are configured. `KIE_API_KEY` is reported in the payload but does not gate the `ok` status.
