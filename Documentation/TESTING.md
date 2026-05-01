# Testing

Three layers, each with its own command.

| Layer | Command | Where | Speed |
|---|---|---|---|
| Unit | `pnpm test` | `tests/unit/**` | fast, no I/O |
| Integration | `pnpm test:integration` | `tests/integration/**` | needs Supabase test project |
| E2E | `pnpm test:e2e` | `e2e/**` | Playwright; spins up `pnpm dev` |

`pnpm test:all` runs all three.

## Adding a unit test

Pure helpers (`lib/voting.ts`, `lib/sorting.ts`, `lib/validation.ts`, `lib/actions/result.ts`) are the unit-test layer. No Supabase imports allowed in these files. Add a test under `tests/unit/<topic>.test.ts`.

`server-only` is mocked in `tests/setup.ts`, so files like `lib/actions/result.ts` (which carry `import "server-only"`) can still be unit-tested.

## Adding an integration test

> Wired in Phase 2 once Supabase clients exist. Will document seed/reset strategy here.

## Adding an e2e test

> Wired in Phase 4 with the first Playwright spec.
