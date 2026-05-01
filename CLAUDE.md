# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where to start

The current build target is `scenius-app/` — a Next.js 15 + Supabase rebuild that supersedes the two legacy projects (kept as reference). For the phased plan, layered architecture, schema, routes, and testing strategy, read [`Documentation/README.md`](./Documentation/README.md) **first** — it is the index of truth.

The rebuild is phased so each phase ends with a green build and can be resumed in a new session. To pick up mid-build: read `Documentation/PLAN.md`, then `cd scenius-app && pnpm test && pnpm typecheck` to confirm the previous phase's checkpoint.

## Repository layout

Three projects living side-by-side (no monorepo tooling, no shared `package.json`):

- `scenius-app/` — **the new build** (Next.js 15 App Router + Supabase). See [`Documentation/PLAN.md`](./Documentation/PLAN.md).
- `scenius-server-main/` — original GraphQL API. Reference only.
- `scenius-web-main/` — original Next.js + Chakra UI frontend. Reference only.

Each project has its own `package.json`, `tsconfig.json`, and `node_modules`. Run commands from inside the relevant project directory.

## Tech stack

**Server** (`scenius-server-main`)
- Apollo Server (`apollo-server-express`) over Express
- Type-GraphQL with `reflect-metadata` (decorator-driven schema)
- MikroORM 4.x targeting PostgreSQL
- Redis-backed sessions via `express-session` + `connect-redis`
- Argon2 for password hashing
- TypeScript compiled to `dist/`, run with `nodemon`

**Web** (`scenius-web-main`)
- Next.js (pages router) + React 17
- Chakra UI + Emotion + Framer Motion
- TypeScript

## Commands

### scenius-app (`cd scenius-app`) — the new build

- `pnpm dev` — Next dev server on `http://localhost:3000`
- `pnpm build` / `pnpm start` — production build and serve
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest unit tests (`tests/unit/**`)
- `pnpm test:integration` — Vitest integration tests against Supabase (`tests/integration/**`)
- `pnpm test:e2e` — Playwright (`e2e/**`)
- `pnpm test:all` — all three layers
- `pnpm db:gen` — regenerate `lib/supabase/types.ts` from the linked Supabase project
- `pnpm db:push` — apply local migrations to the linked Supabase project

Conventions inside `scenius-app`:

- Server Actions live only in `lib/actions/<entity>.ts` and start with `import "server-only"`.
- DB read helpers live only in `lib/queries/<entity>.ts`.
- Pure logic (no Supabase imports) lives in `lib/<topic>.ts` and is the unit-test layer.
- Every Server Action returns the shared `ActionResult<T>` shape from `lib/actions/result.ts`.

### Server (`cd scenius-server-main`) — legacy, reference only
- `yarn watch` — start the TypeScript compiler in watch mode (writes to `dist/`)
- `yarn dev` — run the compiled server with nodemon (must run `watch` in another terminal first, since `dev` reads from `dist/`)
- `yarn start` — run the compiled server once (`node dist/index.js`)
- `yarn start1` — run directly from source via `ts-node` (skips the `dist/` two-step)
- `yarn migration` — create a new MikroORM migration file. Migrations live in `src/migrations/` and are applied automatically on server boot via `orm.getMigrator().up()`.

There is no test runner or linter configured.

### Web (`cd scenius-web-main`) — legacy, reference only
- `yarn dev` — Next.js dev server on `http://localhost:3000`
- `yarn build` / `yarn start` — production build and serve

## Required local services

The server expects these on default ports — there are no env vars or fallbacks:
- **PostgreSQL** with database `scenius`, user `postgres`, password `postgres` (hardcoded in `src/mikro-orm.config.ts`)
- **Redis** on `localhost:6379` (default `redis.createClient()` call in `src/index.ts`)

The Express CORS origin is hardcoded to `http://localhost:3000`, matching the Next.js dev server.

## Architecture notes

**Schema-as-decorators.** Entity classes in `src/entities/` carry both MikroORM decorators (`@Entity`, `@Property`, `@PrimaryKey`) and Type-GraphQL decorators (`@ObjectType`, `@Field`). The same class is the database row type and the GraphQL output type — adding a property to one surface usually means decorating it for both. Fields without `@Field` (e.g. `User.password`) are persisted but never exposed via GraphQL.

**Resolver wiring.** All resolvers are listed explicitly in the `buildSchema({ resolvers: [...] })` call in `src/index.ts`. New resolver classes must be imported and added there — there is no auto-discovery.

**GraphQL context.** `MyContext` (in `src/types.ts`) carries `em` (MikroORM EntityManager), `req`, and `res`. The session userId lives at `req.session.userId` and is the source of truth for "who is logged in" — see `UserResolver.me` and the register/login mutations.

**Auth flow.** Session-based, not JWT. Cookie name is `qid` (see `src/constants.ts`). Register hashes with argon2 then writes via a raw knex query (`createQueryBuilder().getKnexQuery().insert().returning("*")`) rather than `em.persistAndFlush` — this is intentional because the `returning("*")` shape is what gets assigned to `req.session.userId`. Login uses the standard `em.findOne` path. Logout destroys the session and clears the cookie.

**Error responses.** User-facing mutation errors are returned as a `UserResponse` shape (`{ errors?: FieldError[], user?: User }`) rather than thrown — see `UserResolver`. Follow the same pattern when adding mutations that need field-level validation feedback.

**Frontend status.** The web app is a fresh Chakra UI starter — `pages/index.tsx` is `<div>hello world</div>` and there is no GraphQL client wired up yet. When adding API integration, expect to introduce a client (urql, Apollo Client, etc.) and configure it to send credentials so the `qid` session cookie reaches the server.

## Conventions observed in this codebase

- TypeScript strict mode is on (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`). Decorators and `emitDecoratorMetadata` are required for Type-GraphQL / MikroORM.
- Entity classes use `!` non-null assertions on persisted fields (`id!`, `username!`) — this matches the MikroORM + Type-GraphQL pattern; the values are populated by the ORM, not at construction time.
- New entities must be added to the `entities` array in `src/mikro-orm.config.ts` and need an accompanying migration generated via `yarn migration`.
