# Testing

Three layers, each with its own command.

| Layer | Command | Where | Speed |
|---|---|---|---|
| Unit | `pnpm test` | `tests/unit/**` | fast, no I/O |
| Integration | `pnpm test:integration` | `tests/integration/**` | needs Supabase test project |
| E2E | `pnpm test:e2e` | `e2e/**` | Playwright; requires `pnpm dev` running |

`pnpm test:all` runs all three.

## Unit tests (`tests/unit/`)

Pure helpers with no Supabase imports are the unit-test layer.

| File | Covers |
|---|---|
| `voting.test.ts` | `nextVoteState` — all 6 cases (insert, toggle off, update) |
| `sorting.test.ts` | `buildPostsQuery` — hot/new/top + invalid fallback |
| `validation.test.ts` | zod schemas: registerInput, loginInput, postInput, commentInput, forgotPasswordInput, resetPasswordInput (including password-mismatch refine) |
| `result.test.ts` | `ok()` / `fail()` shape |

`server-only` is mocked in `tests/setup.ts` so files that carry `import "server-only"` (e.g. `lib/actions/result.ts`) can still be unit-tested.

## Integration tests (`tests/integration/`)

| File | Covers |
|---|---|
| `schema.test.ts` | Verifies expected tables exist in the connected Supabase project |
| `auth.test.ts` | `registerAction` round-trip against real auth |
| `posts.test.ts` | `createPostAction`, `deletePostAction`, `listPosts` |

Requires a separate Supabase project (or local Supabase via `pnpm dlx supabase start`) with the env vars pointing at it.

## E2E tests (`e2e/`)

| File | Covers |
|---|---|
| `post-crud.spec.ts` | register → create post → view post → delete golden path |
| `voting.spec.ts` | cast vote, toggle off, change vote direction; score sync after reload |
| `mobile.spec.ts` | iPhone 14 viewport (390×844); rapid-tap guard (3 taps → score 1); 44px touch target assertions on vote buttons |
| `forgot-password.spec.ts` | "Forgot password?" link on login page; email form → /sent redirect; security gate — direct access to /login/reset-password without recovery cookie is rejected |

### Running e2e

```bash
# terminal 1
cd scenius-app && pnpm dev

# terminal 2
cd scenius-app && pnpm test:e2e
```

`.env.local` must be populated with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Adding a unit test

Add a test under `tests/unit/<topic>.test.ts`. The file under test must live in `lib/<topic>.ts` with no Supabase imports.

## Adding an e2e test

Add a spec under `e2e/<feature>.spec.ts`. Use `test.use({ viewport: ... })` for device-specific tests. Seed state with direct page interactions (register, login) rather than API calls — keeps tests self-contained.
