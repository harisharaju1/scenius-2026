# Modernize scenius into a deployable Reddit-like app

## Context

`scenius/` is a 2021 Ben-Awad-style fullstack scaffold split across two projects (`scenius-server-main` Apollo+MikroORM+Redis, `scenius-web-main` Next.js+Chakra "hello world"). It never reached a usable state — the web app isn't wired to the API, only the `User` table has a migration, and posts have only a `title`. You confirmed it should become a small Reddit-like app where any logged-in user can create posts, upvote/downvote, and sort by hot/new/top. You chose: MVP+voting scope, **Next.js 15 full-stack** (collapse both projects into one), **Vercel** for the app, **rebuild fresh**, and **Supabase as the backend** (Postgres + Auth + RLS) — you already use it on another project.

The existing repos become reference material — entity shapes, the username/password length rules, and the `UserResponse { errors[], user }` mutation pattern are worth porting; everything else (Apollo 2, Type-GraphQL 1, MikroORM 4, Argon2, Express+Redis-session plumbing) is replaced because Supabase Auth handles password hashing, sessions, and JWT issuance.

This plan is structured so it can be executed across **multiple sessions** without a single one ever needing to hold the whole picture in context. Each phase is a self-contained slice with a green build at the end.

---

## Target stack (April 2026)

- **Framework**: Next.js 15 App Router, React 19, TypeScript 5.x (strict)
- **Styling/UI**: Tailwind CSS v4, shadcn/ui, `next-themes`
- **Backend**: **Supabase** — Postgres + Auth (email/password) + Row-Level Security
- **DB access**: `@supabase/supabase-js` from Server Components / Server Actions; `@supabase/ssr` for cookie-based session handling in Next.js
- **Migrations**: Supabase CLI (`supabase migration new`, `supabase db push`)
- **Generated types**: `supabase gen types typescript --linked` committed to the repo
- **Forms / validation**: `react-hook-form` + `zod`; the same zod schemas reused inside Server Actions
- **Mutations**: Server Actions (no GraphQL, no REST layer)
- **Tests**: **Vitest** (unit + integration) + **Playwright** (e2e)
- **Deploy**: **Vercel** (app) + **Supabase** (everything backend)

`pnpm` as the package manager.

---

## Phased execution roadmap

Six phases. Each ends with a checkpoint commit and a green test/typecheck/build run, so you can stop and resume — even from a fresh Claude session that only has access to this file plus the repo state.

**To resume mid-build**, a new agent reads, in order: (1) `Documentation/PLAN.md` (this file), (2) `Documentation/ARCHITECTURE.md`, (3) `git log --oneline -10`, then runs `pnpm test && pnpm typecheck` to confirm the previous phase is sound before starting the next. Each phase below ends with a "Resume hint" describing the signal that the phase is done.

### Phase 1 — Project skeleton + tooling

**Goal**: a blank Next.js 15 app that boots, builds, type-checks, and runs the test runner. No tests yet, but the harness is wired.

**Files created**:
- `scenius-app/{package.json,tsconfig.json,next.config.ts,eslint.config.mjs,.prettierrc,.gitignore}`
- `scenius-app/app/{layout.tsx,page.tsx,globals.css}`
- `scenius-app/components.json` (shadcn init)
- `scenius-app/vitest.config.ts`, `scenius-app/tests/setup.ts`
- `scenius-app/playwright.config.ts`, `scenius-app/e2e/.gitkeep`
- `scenius-app/lib/actions/result.ts` — shared `ActionResult<T>` + `FieldError` types
- Root `CLAUDE.md` updated to point at `Documentation/README.md`
- `Documentation/{README.md,ARCHITECTURE.md,ROUTES.md,SCHEMA.md,TESTING.md}` (stubs filled with what each will contain at the end of each later phase)

**`package.json` scripts**: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:integration`, `test:e2e`, `db:gen`, `db:push`.

**Verify**: `pnpm dev` shows hello page; `pnpm test`, `pnpm typecheck`, `pnpm build` all clean.
**Commit**: `feat(phase-1): scaffold next.js app with test infra`
**Resume hint**: `scenius-app/package.json` exists and includes `vitest` + `@playwright/test`.

### Phase 2 — Supabase + schema

**Goal**: schema applied to a Supabase project; generated types compile; the Next app holds typed Supabase clients behind `lib/supabase/`.

**Files**:
- `scenius-app/supabase/migrations/0001_init.sql` (profiles, posts, votes, triggers, RLS, `posts_hot` view)
- `scenius-app/lib/supabase/{client,server,middleware,types}.ts`
- `scenius-app/middleware.ts` (session refresh)
- `scenius-app/tests/integration/schema.test.ts` — vote-trigger smoke test
- `Documentation/SCHEMA.md` — annotated schema + mermaid ER diagram filled in

**Verify**: `pnpm db:push` succeeds against a Supabase test project; `pnpm db:gen` writes a non-empty `types.ts`; `pnpm test:integration` passes the trigger smoke test.
**Commit**: `feat(phase-2): supabase schema + typed clients`
**Resume hint**: `lib/supabase/types.ts` references `posts`, `profiles`, `votes`.

### Phase 3 — Auth (register / login / logout)

**Goal**: a user can register, log out, log back in, and see their username in the header.

**Files**:
- `scenius-app/lib/validation.ts` — `registerInput`, `loginInput`, `postInput` zod schemas
- `scenius-app/lib/actions/auth.ts` — `registerAction`, `loginAction`, `logoutAction` (return `ActionResult`)
- `scenius-app/app/(auth)/login/page.tsx`, `register/page.tsx`, `callback/route.ts`
- `scenius-app/components/header.tsx`, `components/auth/{login-form,register-form}.tsx`
- `scenius-app/tests/unit/validation.test.ts` — exhaustive zod coverage
- `scenius-app/tests/integration/auth.test.ts` — register-then-login round trip
- `Documentation/ROUTES.md` updated with `/login`, `/register`, `/auth/callback`

**Verify**: register a user via the UI, log out, log back in, see username in header. `pnpm test` and `pnpm test:integration` clean.
**Commit**: `feat(phase-3): auth (register/login/logout)`
**Resume hint**: `lib/actions/auth.ts` exists and exports the three actions.

- One thing to do in Supabase dashboard — if you ever enable email confirmation, set the redirect URL to <your-domain>/callback under Authentication → URL Configuration.

### Phase 4 — Posts (create / list / view / delete)

**Goal**: logged-in users can create posts; everyone can read; post-detail works; owner can delete.

**Files**:
- `scenius-app/lib/queries/posts.ts` — `listPosts(sort, cursor)`, `getPostById(id)`, `getPostWithAuthorAndVote(id, userId)`
- `scenius-app/lib/actions/posts.ts` — `createPostAction`, `deletePostAction`
- `scenius-app/app/page.tsx` (feed), `app/posts/new/page.tsx`, `app/posts/[id]/page.tsx`
- `scenius-app/components/posts/{post-card,post-form,delete-button}.tsx`
- `scenius-app/tests/unit/queries-posts.test.ts` (stubbed Supabase client)
- `scenius-app/tests/integration/posts.test.ts` — create, fetch, delete-by-non-owner is rejected by RLS
- `scenius-app/e2e/post-crud.spec.ts` — Playwright golden path
- `Documentation/ROUTES.md` updated with `/`, `/posts/new`, `/posts/[id]`

**Verify**: full CRUD via the UI; non-author cannot delete (server returns error from RLS).
**Commit**: `feat(phase-4): post CRUD`
**Resume hint**: `app/posts/[id]/page.tsx` exists and a Playwright spec passes.

### Phase 5 — Voting + sorting

**Goal**: upvote / downvote with optimistic UI; hot / new / top sort tabs reorder the feed.

**Files**:
- `scenius-app/lib/voting.ts` — pure `nextVoteState(currentVote, requestedVote) → { kind: 'insert'|'update'|'delete', value?: 1|-1 }`. Tested exhaustively (3 current × 2 requested = 6 cases).
- `scenius-app/lib/sorting.ts` — pure `buildPostsOrderBy(sort)` → table-or-view name + order-by fragment.
- `scenius-app/lib/actions/votes.ts` — `castVoteAction(postId, value)` (uses `nextVoteState`)
- `scenius-app/components/posts/{vote-buttons,sort-tabs}.tsx`
- `scenius-app/tests/unit/{voting,sorting}.test.ts` — exhaustive
- `scenius-app/tests/integration/votes.test.ts` — trigger correctness (insert → score+1; flip → score moves by 2; delete → score-=value)
- `scenius-app/e2e/voting.spec.ts` — vote, refresh, score persists; toggle vote off

**Verify**: vote from two browser sessions; sort tabs reorder visibly. Trigger integration test green.
**Commit**: `feat(phase-5): voting + sorting`
**Resume hint**: `lib/voting.ts` exists and `pnpm test` covers all `nextVoteState` cases.

### Phase 6 — Polish + deploy

**Goal**: production-ready and live on a Vercel URL.

**Files**:
- `loading.tsx`, `error.tsx`, `not-found.tsx` for the relevant route segments
- Empty-state components for the feed and post detail
- `Documentation/DEPLOY.md` (Vercel + Supabase prod setup, env vars, redirect URLs)
- `scenius-app/README.md` — quickstart

**Verify**: Vercel preview URL passes the full golden path; Supabase Auth's "Site URL" + redirect URLs include the deployed origin.
**Commit**: `feat(phase-6): deploy`
**Resume hint**: `Documentation/DEPLOY.md` exists and a Vercel deployment URL is in the README.

---

## Repo layout

The two existing directories stay untouched as reference. The new app is a sibling directory `scenius-app/`. `Documentation/` lives at the `scenius/` root.

```
scenius/
  CLAUDE.md                       # repo-root agent guide; points at Documentation/
  Documentation/                  # single source of truth for non-code knowledge
    README.md
    PLAN.md
    ARCHITECTURE.md
    ROUTES.md
    SCHEMA.md
    TESTING.md
    DEPLOY.md                     # added in Phase 6
  scenius-server-main/            # original 2021 server (reference only)
  scenius-web-main/               # original 2021 web (reference only)
  scenius-app/                    # the new app
    app/
      layout.tsx
      page.tsx                    # feed (sort-aware via ?sort=)
      loading.tsx, error.tsx, not-found.tsx
      (auth)/
        login/page.tsx
        register/page.tsx
        callback/route.ts
      posts/
        new/page.tsx
        [id]/page.tsx
    components/
      ui/*                        # shadcn primitives
      header.tsx
      auth/{login-form,register-form}.tsx
      posts/{post-card,post-form,vote-buttons,sort-tabs,delete-button}.tsx
    lib/
      actions/                    # Server Actions (server-only)
        result.ts                 # ActionResult<T>, FieldError
        auth.ts
        posts.ts
        votes.ts
      queries/                    # typed read helpers (server-only)
        posts.ts
      supabase/
        client.ts                 # browser client
        server.ts                 # server client w/ cookies (server-only)
        middleware.ts             # updateSession helper
        types.ts                  # generated Database type
      validation.ts               # zod schemas (shared client + server)
      voting.ts                   # pure: nextVoteState
      sorting.ts                  # pure: buildPostsOrderBy
    supabase/
      migrations/                 # SQL files
      config.toml
    middleware.ts
    tests/
      setup.ts
      unit/
        validation.test.ts
        voting.test.ts
        sorting.test.ts
        queries-posts.test.ts
      integration/
        schema.test.ts
        auth.test.ts
        posts.test.ts
        votes.test.ts
    e2e/
      post-crud.spec.ts
      voting.spec.ts
    .env.example
    package.json, tsconfig.json, next.config.ts
    vitest.config.ts, playwright.config.ts
    components.json
```

---

## Database schema (Supabase migrations)

```sql
-- profiles: 1:1 with auth.users, holds username (display name)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 5 and 30),
  created_at timestamptz not null default now()
);

create table public.posts (
  id bigserial primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  body text not null default '',
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_score_idx on public.posts (score desc);
create index posts_author_idx on public.posts (author_id);

create table public.votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id bigint not null references public.posts(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index votes_post_idx on public.votes (post_id);

-- score is denormalized; trigger keeps it in sync
create function public.update_post_score() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set score = score + new.value where id = new.post_id;
  elsif (tg_op = 'UPDATE') then
    update public.posts set score = score + (new.value - old.value) where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set score = score - old.value where id = old.post_id;
  end if;
  return null;
end $$;
create trigger votes_score_sync
  after insert or update or delete on public.votes
  for each row execute function public.update_post_score();

-- profile auto-created on signup; username comes from raw_user_meta_data
create function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- view used by "hot" sort
create view public.posts_hot as
  select *,
    (log(greatest(abs(score), 1)) +
     (extract(epoch from created_at) - 1700000000) / 45000.0) as hot_rank
  from public.posts;
```

### RLS policies

```sql
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.votes    enable row level security;

-- profiles: anyone can read, owner can insert/update self
create policy profiles_select_all on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- posts: anyone can read; only authed users can insert as themselves; owner can update/delete
create policy posts_select_all on public.posts for select using (true);
create policy posts_insert_authed on public.posts for insert with check (auth.uid() = author_id);
create policy posts_update_own on public.posts for update using (auth.uid() = author_id);
create policy posts_delete_own on public.posts for delete using (auth.uid() = author_id);

-- votes: anyone can read (so we can show "your current vote"); user manages their own row
create policy votes_select_all on public.votes for select using (true);
create policy votes_insert_own on public.votes for insert with check (auth.uid() = user_id);
create policy votes_update_own on public.votes for update using (auth.uid() = user_id);
create policy votes_delete_own on public.votes for delete using (auth.uid() = user_id);
```

RLS is the authoritative authorization layer. Server Actions still re-check `auth.getUser()` for fast UX errors, but the database is the source of truth.

---

## Auth approach

- **Email + password via Supabase Auth.** Reddit's "username login" needs a SECURITY DEFINER RPC to look up email by username; deferred to a follow-up since you can sign in with email and still display username everywhere.
- Registration form collects `username`, `email`, `password`. Server Action calls `supabase.auth.signUp({ email, password, options: { data: { username } } })`. The `handle_new_user` trigger copies `raw_user_meta_data.username` into `public.profiles`. If username is taken, the unique constraint fires and the trigger fails — the Server Action surfaces that as a `username` field error (matching the original `FieldError` shape).
- **Email confirmation**: enable in Supabase dashboard if you want gated signups; otherwise turn off for the simplest dev loop. Plan defaults to OFF for MVP.
- `@supabase/ssr` writes/reads the session cookie. `middleware.ts` calls `updateSession` so server components see fresh tokens.
- `middleware.ts` redirects unauthenticated requests to `/login` for `/posts/new`. Server Actions for createPost/vote/delete re-check via `supabase.auth.getUser()` (defense in depth — RLS is the real gate).

---

## Feature mapping (old → new)

| Original | New |
|---|---|
| `UserResolver.register` (raw knex insert + Argon2) | `registerAction`: zod-validate → `signUp({ email, password, options: { data: { username } } })`. Trigger creates `profiles` row. Argon2 dropped — Supabase handles hashing. |
| `UserResolver.login` | `loginAction` → `signInWithPassword` |
| `UserResolver.logout` | `logoutAction` → `signOut` |
| `UserResolver.me` | `supabase.auth.getUser()` in server components / actions |
| `PostResolver.posts` | RSC fetch in `app/page.tsx` driven by `?sort=`, joined with `profiles` and the current user's `votes` row |
| `PostResolver.post` | RSC fetch in `app/posts/[id]/page.tsx` |
| `PostResolver.createPost` / `deletePost` | `createPostAction` / `deletePostAction`; RLS enforces ownership |
| `UserResponse { errors, user }` validation pattern | All actions return the shared `ActionResult<T>` shape; forms render via `useFormState` |

New, not in the original:
- `castVoteAction(postId, value)` — uses `nextVoteState` to decide insert / update / delete; trigger keeps `posts.score` in sync.
- Sorts: **new** = `created_at desc`, **top** = `score desc, created_at desc`, **hot** = `posts_hot` view ordered by `hot_rank desc`.

---

## Testability strategy

The app is small, but testability is treated as a first-class constraint so future changes (and future Claude sessions) can verify themselves quickly.

**Three test layers**:
1. **Unit (Vitest)** — pure helpers in `lib/{voting,sorting,validation}.ts`. No I/O, no Supabase. Fast.
2. **Integration (Vitest)** — Server Actions and query helpers running against a real Supabase project (cloud test project or `supabase start` locally). Each suite truncates `votes`, `posts`, `profiles` and re-seeds via the service-role key. Auth users created via the admin API.
3. **E2E (Playwright)** — golden paths through real browser sessions. One spec per major feature surface (Phase 4 + Phase 5).

**Pure-helper extraction**: any non-trivial decision (which DB op a vote should produce; how to translate a sort key into SQL; how to validate input) lives in a `lib/<topic>.ts` pure function with no Supabase imports. The Server Action becomes a thin shell: `validate → call helper → call Supabase → return ActionResult`. Most of the testable surface is unit-testable without a database.

**One action result shape**: `type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: FieldError[] }` — defined once in `lib/actions/result.ts`, consumed by every form via `useFormState`.

**Server-only enforcement**: every file under `lib/actions/`, `lib/queries/`, and `lib/supabase/server.ts` starts with `import "server-only"` so accidental client imports fail at build time, not runtime.

**Test scripts**: `pnpm test` (unit), `pnpm test:integration` (integration, needs `SUPABASE_TEST_URL` + service-role key), `pnpm test:e2e` (Playwright), `pnpm test:all`. CI on Vercel runs `test` and `test:integration`; `test:e2e` runs locally on demand and against preview deploys.

---

## AI-navigability strategy

Goal: a fresh agent (or you, six months from now) lands in this repo and finds any answer in under a minute.

**`Documentation/` is the index of truth**:
- `README.md` — one-paragraph orientation + a numbered reading order
- `PLAN.md` — this file (the build plan)
- `ARCHITECTURE.md` — layer responsibilities, data flow diagram, where each kind of code lives
- `ROUTES.md` — table: route → access → server action(s) → queries → notes
- `SCHEMA.md` — annotated SQL + mermaid ER diagram
- `TESTING.md` — how to add a test in each layer; how the test DB resets
- `DEPLOY.md` — Vercel + Supabase prod setup (Phase 6)

**Predictable, single-canonical-place file structure**:
- Server Actions live only in `lib/actions/<entity>.ts`
- DB query helpers live only in `lib/queries/<entity>.ts`
- Pure logic lives in `lib/<topic>.ts`, never inside a component or action
- Entity-scoped components live in `components/<entity>/`
- Tests are co-located by layer in `tests/{unit,integration}/` and `e2e/`

**Naming conventions**:
- Server Actions: `<verb><Entity>Action` (e.g., `castVoteAction`, `createPostAction`)
- Queries: `get<Entity>By<Key>` / `list<Entities>(...)`
- Pure helpers: noun-based (`nextVoteState`, `buildPostsOrderBy`)
- React components: `PascalCase.tsx`, default-export the component, named-export sub-pieces only when reused

**Short TSDoc on public exports** — one line stating intent and any non-obvious constraint. No essays; just enough that hover-help is useful.

**`CLAUDE.md` at the repo root** is updated in Phase 1 to: (a) point at `Documentation/README.md` as the first read, (b) summarize commands per project, (c) state the action / query / pure-helper boundary so an agent doesn't accidentally write a Supabase query inside a component.

---

## What gets ported verbatim

- `FieldError { field, message }` shape — re-purposed as the shared `ActionResult` error shape so the form UX matches the original intent.
- Validation thresholds: username ≥ 5 (was > 4), password ≥ 6 (was > 6 — kept). Supabase password min-length set to 6 in the dashboard to match.

## What's deliberately dropped

- Apollo Server, Type-GraphQL, MikroORM, Express, `connect-redis`, `cors`, the `dist/`-watch dev loop.
- Argon2 — Supabase Auth handles password hashing.
- Manual session middleware — `@supabase/ssr` replaces it.
- The `Hello` resolver.

## Out of scope (deferred)

Comments, communities/subreddits, OAuth providers, password reset UX, image uploads (Supabase Storage), moderation tools, infinite-scroll pagination beyond a basic cursor, full-text search, true username-based login (needs a SECURITY DEFINER RPC). Each is a clean follow-up once the MVP is live.
