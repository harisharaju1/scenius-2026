# Architecture

> Filled out at the end of Phase 4. Until then, treat [`PLAN.md`](./PLAN.md) as the architecture spec.

## Layers (target)

- **Routes** (`scenius-app/app/`) — Server Components by default; Client Components only where interactive
- **Server Actions** (`scenius-app/lib/actions/<entity>.ts`) — `import "server-only"`; thin shells: `validate → call helper → call Supabase → return ActionResult`
- **Queries** (`scenius-app/lib/queries/<entity>.ts`) — `import "server-only"`; typed read helpers used by Server Components
- **Pure helpers** (`scenius-app/lib/<topic>.ts`) — no I/O, no Supabase; the place for testable decision logic
- **Supabase clients** (`scenius-app/lib/supabase/`) — `client.ts` (browser), `server.ts` (server-only), `middleware.ts` (session refresh)

## Boundaries enforced

- Action / query files start with `import "server-only"` so client imports fail at build time.
- All Server Actions return the shared `ActionResult<T>` shape from `lib/actions/result.ts`.
- Pure helpers (`voting.ts`, `sorting.ts`, `validation.ts`) never import Supabase.
