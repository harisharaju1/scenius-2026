# Modernize scenius into a deployable Reddit-like app

## Context

`scenius/` is a 2021 Ben-Awad-style fullstack scaffold split across two projects (`scenius-server-main` Apollo+MikroORM+Redis, `scenius-web-main` Next.js+Chakra "hello world"). It never reached a usable state — the web app isn't wired to the API, only the `User` table has a migration, and posts have only a `title`. You confirmed it should become a small Reddit-like app where any logged-in user can create posts, upvote/downvote, and sort by hot/new/top. You chose: MVP+voting scope, **Next.js 15 full-stack** (collapse both projects into one), **Vercel** for the app, **rebuild fresh**, and **Supabase as the backend** (Postgres + Auth + RLS) — you already use it on another project.

The existing repos become reference material — entity shapes, the username/password length rules, and the `UserResponse { errors[], user }` mutation pattern are worth porting; everything else (Apollo 2, Type-GraphQL 1, MikroORM 4, Argon2, Express+Redis-session plumbing) is replaced because Supabase Auth handles password hashing, sessions, and JWT issuance for us.

## Target stack (April 2026)

- **Framework**: Next.js 15 App Router, React 19, TypeScript 5.x
- **Styling/UI**: Tailwind CSS v4, shadcn/ui, `next-themes`
- **Backend**: **Supabase** — Postgres + Auth (email/password) + Row-Level Security
- **DB access**: `@supabase/supabase-js` from Server Components / Server Actions; `@supabase/ssr` for cookie-based session handling in Next.js
- **Migrations**: Supabase CLI (`supabase migration new`, `supabase db push`)
- **Generated types**: `supabase gen types typescript --linked` committed to the repo
- **Forms/validation**: `react-hook-form` + `zod`; the same zod schemas reused inside Server Actions
- **Mutations**: Server Actions (no GraphQL, no REST layer)
- **Deploy**: **Vercel** (app) + **Supabase** (everything backend). Supabase project lives in your existing org.

`pnpm` as the package manager.

## New repo layout

The two existing directories stay untouched as reference. The new app is a sibling directory, e.g. `scenius-app/`:

```
scenius-app/
  app/
    layout.tsx                    # root layout, theme provider, header
    page.tsx                      # home feed (default sort: hot)
    (auth)/
      login/page.tsx
      register/page.tsx
      callback/route.ts           # supabase auth callback for email confirmations
    posts/
      new/page.tsx                # create post (auth-gated)
      [id]/page.tsx               # post detail
  components/
    ui/*                          # shadcn primitives
    header.tsx                    # logo, sort tabs, login/logout
    post-card.tsx
    vote-buttons.tsx              # up/down with optimistic update
    sort-tabs.tsx                 # hot | new | top
    post-form.tsx
  lib/
    actions/
      auth.ts                     # registerAction, loginAction, logoutAction
      posts.ts                    # createPost, deletePost
      votes.ts                    # castVote
    validation.ts                 # zod schemas (shared client + server)
    supabase/
      client.ts                   # browser client (createBrowserClient)
      server.ts                   # server client w/ cookies (createServerClient)
      middleware.ts               # session refresh helper
      types.ts                    # generated Database type re-export
  supabase/
    migrations/                   # generated SQL files
    config.toml
  middleware.ts                   # session refresh + protect /posts/new
  .env.example                    # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server-only)
  package.json
  tsconfig.json
  components.json                 # shadcn registry
```

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

RLS replaces the manual ownership checks the original `PostResolver` would have needed. Server Actions still re-check `auth()` for fast UX errors, but the database is the source of truth.

## Auth approach

- **Email + password via Supabase Auth.** Reddit's "username login" needs a SECURITY DEFINER RPC to look up email by username; deferred to a follow-up since you can sign in with email and still display username everywhere.
- Registration form collects `username`, `email`, `password`. Server Action calls `supabase.auth.signUp({ email, password, options: { data: { username } } })`. The `handle_new_user` trigger copies `raw_user_meta_data.username` into `public.profiles`. If username is taken, the unique constraint fires and the trigger fails — the Server Action surfaces that as a `username` field error (matching the original `FieldError` shape).
- **Email confirmation**: enable in Supabase dashboard if you want gated signups; otherwise turn off for the simplest dev loop. Plan defaults to OFF for MVP.
- `@supabase/ssr` writes/reads the session cookie. `middleware.ts` calls `updateSession` so server components see fresh tokens.
- `middleware.ts` also redirects unauthenticated requests to `/login` for `/posts/new`. Server Actions for createPost/vote/delete re-check via `supabase.auth.getUser()` (defense in depth — RLS is the real gate).

## Feature mapping (old → new)

| Original | New |
|---|---|
| `UserResolver.register` (raw knex insert + Argon2) | `registerAction` Server Action: zod-validate → `supabase.auth.signUp({ email, password, options: { data: { username } } })`. Trigger creates `profiles` row. Argon2 dropped — Supabase handles hashing. |
| `UserResolver.login` | `loginAction` → `supabase.auth.signInWithPassword({ email, password })` |
| `UserResolver.logout` | `logoutAction` → `supabase.auth.signOut()` |
| `UserResolver.me` | `supabase.auth.getUser()` in server components / Server Actions |
| `PostResolver.posts` | RSC fetch in `app/page.tsx` with `?sort=hot|new|top` searchparam, joined with `profiles` for author username and with the current user's vote (left join on `votes` filtered by `auth.uid()`) |
| `PostResolver.post` | RSC fetch in `app/posts/[id]/page.tsx` |
| `PostResolver.createPost` | `createPostAction` Server Action; RLS enforces `author_id = auth.uid()` |
| `PostResolver.deletePost` | `deletePostAction`; RLS enforces ownership |
| `UserResponse { errors, user }` validation pattern | Server Actions return `{ ok: true } | { ok: false, errors: { field, message }[] }`, surfaced via `useFormState` |

New, not in the original:
- `castVoteAction(postId, value)` — `upsert` on `votes` with `onConflict: 'user_id,post_id'`. If `value` matches the existing row, delete it instead (toggle off). Trigger keeps `posts.score` in sync.
- Sorts:
  - **new**: `order by created_at desc`
  - **top**: `order by score desc, created_at desc`
  - **hot**: `order by (log(greatest(abs(score), 1)) + (extract(epoch from created_at) - 1700000000) / 45000.0) desc` — Reddit's algorithm in SQL, exposed via a view `posts_hot` to keep the `select` ergonomic.

## What gets ported verbatim

- `FieldError { field, message }` shape — re-purposed as Server Action return type so the form UX matches the original intent.
- Validation thresholds: username length > 4 (now 5–30), password length > 6 (kept ≥ 6 minimum, Supabase enforces a min-length you can configure in the dashboard — set to 6).

## What's deliberately dropped

- Apollo Server, Type-GraphQL, MikroORM, Express, `connect-redis`, `cors`, the `dist/`-watch dev loop.
- Argon2 (Supabase Auth handles password hashing — bcrypt under the hood).
- Manual session middleware — `@supabase/ssr` middleware replaces it.
- The `Hello` resolver.

## Critical files to create (in dependency order)

0. `scenius/Documentation/PLAN.md` — copy of this plan, committed alongside the project so you can refer back to it without leaving the repo.
1. `package.json`, `tsconfig.json`, `next.config.ts`, Tailwind v4 setup, `components.json` (shadcn init)
2. `supabase/migrations/0001_init.sql` (schema + RLS + triggers above) → `supabase db push`
3. `lib/supabase/{client,server,middleware,types}.ts` + `middleware.ts`
4. `lib/validation.ts` (zod schemas for register, login, post)
5. `lib/actions/auth.ts`, `lib/actions/posts.ts`, `lib/actions/votes.ts`
6. `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/callback/route.ts`
7. `app/page.tsx` (feed, sort-aware) + `components/post-card.tsx` + `components/vote-buttons.tsx` + `components/sort-tabs.tsx` + `components/header.tsx`
8. `app/posts/new/page.tsx` + `components/post-form.tsx`
9. `app/posts/[id]/page.tsx` (with delete button gated on ownership)
10. `.env.example`, README run/deploy steps

## Verification

End-to-end checks before declaring done:

1. **Local Supabase**: `pnpm dlx supabase start` (or use the cloud project), apply migrations, `pnpm dlx supabase gen types typescript --linked > lib/supabase/types.ts`.
2. **Local app**: `pnpm install`, populate `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `pnpm dev`.
3. **Golden path in browser**: register user A (email + username) → log out → register user B → log in as B → create post → upvote own post (score = 1) → log in as A → downvote (score = -1, then back to 0 if A toggles) → switch sort tabs hot/new/top → delete-as-non-owner is rejected by RLS → delete-as-owner succeeds.
4. **Edge cases**: register with username ≤ 4 chars or duplicate username returns FieldError shape; voting twice with same value toggles off; changing vote from +1 to −1 moves score by 2 (trigger correctness).
5. **Type / build**: `pnpm typecheck` and `pnpm build` clean. Generated Supabase types compile against the schema.
6. **Deploy**: push to a new GitHub repo → import to Vercel → add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` only if needed by a server-only path) → ensure Supabase Auth's "Site URL" and redirect URLs include the Vercel domain → smoke-test the same golden path on the deployed URL.

## Out of scope (deliberately deferred)

- Comments, communities/subreddits, OAuth providers, password reset UX, image uploads (Supabase Storage), moderation tools, infinite-scroll pagination beyond a basic cursor, full-text search, true username-based login (needs a SECURITY DEFINER RPC). Each is a clean follow-up once the MVP is live.
