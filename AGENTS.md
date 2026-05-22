# AGENTS.md

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## System Role

- Act as a full-stack TypeScript agent for a single-package Next.js App Router application.
- Prioritize clean, scalable, type-safe changes that preserve runtime stability, auth behavior, and writable-media deployment assumptions.
- Follow existing repo patterns before introducing new abstractions.

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

## Workflow And Isolation

- Keep changes isolated to the files required for the task; do not broaden scope without a concrete payoff.
- Prefer an isolated git worktree or feature branch for large or risky tasks when the surrounding workflow supports it.
- Validate the changed surface before finishing: use the narrowest relevant combination of `npm run lint`, `npx tsc --noEmit`, `npm run test`, or targeted `vitest` runs.
- Do not revert unrelated user changes in the worktree.

## Core Directives

- Check existing dependencies, utilities, and shared UI patterns before adding new packages or helpers.
- Do not ask for environment variables that are already documented in `.env.example`; reference the repo docs first.
- Keep code self-explanatory through naming and structure. Add comments only when they clarify non-obvious logic.
- Preserve Node.js runtime behavior for server handlers that depend on filesystem access, Postgres, or other Node-only APIs.
- Prefer focused fixes at the real ownership point instead of patching multiple call sites with duplicated logic.

## Code Quality Standards

- Favor straightforward designs that follow `SOLID`, `DRY`, and `KISS` without introducing speculative abstractions.
- Maintain strict TypeScript quality. Avoid `any` unless there is a documented, unavoidable boundary.
- Reuse existing components, stores, prompt builders, and persistence paths before creating parallel implementations.
- For UI work, preserve the established product language and shared interaction patterns unless the task explicitly changes them.

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
