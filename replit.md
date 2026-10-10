# Lumi

An adult-guided learning companion for children with learning differences. Lumi never diagnoses.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — development-only demo accounts; details in DEMO.md
- `pnpm --filter @workspace/lumi run dev` — frontend, through its managed workflow
- Required env: `DATABASE_URL` — Postgres connection string
- Required secret: `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: explicitly requested express-session and bcrypt; separate PostgreSQL-backed adult/student cookies
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

Frontend: artifacts/lumi/src. Backend: artifacts/api-server/src/routes. Database: lib/db/src/schema. Contract: lib/api-spec/openapi.yaml. Shared visual tokens and Tailwind configuration: artifacts/lumi/src/index.css.

## Architecture decisions

- Preserve pnpm artifact package structure rather than introducing parallel client/server roots.
- No diagnostic logic or live AI/chat in this phase.
- A student's current database assignment is authoritative, including after an adult changes it.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
