# Architecture

## Layers

- **Routes** (`scenius-app/app/`) — Server Components by default; Client Components only where interactive
- **Server Actions** (`scenius-app/lib/actions/<entity>.ts`) — `import "server-only"`; thin shells: `validate → call helper → call Supabase → return ActionResult`
- **Queries** (`scenius-app/lib/queries/<entity>.ts`) — `import "server-only"`; typed read helpers used by Server Components
- **Pure helpers** (`scenius-app/lib/<topic>.ts`) — no I/O, no Supabase; the place for testable decision logic
- **Supabase clients** (`scenius-app/lib/supabase/`) — `client.ts` (browser), `server.ts` (server-only), `middleware.ts` (session refresh)

## Boundaries enforced

- Action / query files start with `import "server-only"` so client imports fail at build time.
- All Server Actions return the shared `ActionResult<T>` shape from `lib/actions/result.ts`.
- Pure helpers (`voting.ts`, `sorting.ts`, `validation.ts`) never import Supabase.

## File map

```
scenius-app/
  app/
    layout.tsx                        # root layout — ThemeProvider, Header, Viewport export
    page.tsx                          # feed (hot/new/top sort via ?sort=)
    loading.tsx                       # root-level Suspense skeleton
    error.tsx                         # root-level error boundary (client)
    not-found.tsx                     # root-level 404
    global-error.tsx                  # top-level uncaught error boundary (client)
    (auth)/
      login/page.tsx                  # email + password login
      register/page.tsx               # username + email + password registration
      register/confirm/page.tsx       # "check your email" page post-registration
      callback/route.ts               # Supabase PKCE code exchange for email confirmation
    posts/
      new/page.tsx                    # create post (auth-gated by middleware)
      [id]/page.tsx                   # post detail: body, vote buttons, comments
      [id]/loading.tsx                # post detail skeleton
      [id]/not-found.tsx              # post-specific 404

  components/
    header.tsx                        # logo, sort tabs, login/logout, 44px touch targets
    auth/
      login-form.tsx                  # react-hook-form; detects unconfirmed email sentinel
      register-form.tsx               # react-hook-form; redirects to /register/confirm on success
    posts/
      post-card.tsx                   # feed card: title, author, score, comment count link
      post-form.tsx                   # create post form (title + optional body)
      vote-buttons.tsx                # up/down with useOptimistic + inFlight ref guard
      delete-button.tsx               # owner-only delete with confirm dialog
      comment-form.tsx                # textarea + submit; resets on success

    ui/                               # shadcn primitives: button, input, label, textarea

  lib/
    actions/
      result.ts                       # ActionResult<T> = { ok: true, data } | { ok: false, errors }
      auth.ts                         # registerAction, loginAction, logoutAction
      posts.ts                        # createPostAction, deletePostAction
      votes.ts                        # castVoteAction (upsert/delete with toggle logic)
      comments.ts                     # addCommentAction
    queries/
      posts.ts                        # listPosts(sort), getPostById, getUserVoteForPost
      comments.ts                     # getCommentsByPostId
    voting.ts                         # pure: nextVoteState(current, requested) → VoteState
    sorting.ts                        # pure: buildPostsQuery(sort) → { from, orderBy }
    validation.ts                     # zod schemas: registerInput, loginInput, postInput, commentInput
    images.ts                         # pure: extractStoragePaths(body, bucketBase) → string[]
    utils.ts                          # shadcn cn() helper
    supabase/
      client.ts                       # createBrowserClient
      server.ts                       # createServerClient (cookies)
      middleware.ts                   # updateSession helper for middleware.ts
      types.ts                        # generated Database type (pnpm db:gen)

  middleware.ts                       # session refresh + redirect /posts/new → /login for anon

  tests/
    setup.ts                          # mocks server-only for unit tests
    unit/                             # voting, sorting, validation, result
    integration/                      # auth, posts, schema (needs Supabase test project)

  e2e/
    post-crud.spec.ts                 # register → create → view → delete golden path
    voting.spec.ts                    # cast, toggle, change vote; score sync
    mobile.spec.ts                    # rapid-tap guard, 44px touch target assertions

  supabase/
    migrations/
      0001_init.sql                   # profiles, posts, votes, triggers, RLS, posts_hot view
      0002_comments.sql               # comments table + RLS
    config.toml
```

## Key design decisions

### Voting atomicity on mobile
`useTransition`'s `isPending` becomes `true` asynchronously — rapid taps can fire before React re-renders. `vote-buttons.tsx` uses a synchronous `useRef<boolean>` (`inFlight`) checked before any state update as a guard. Only one vote request is in-flight at a time.

### Dynamic `emailRedirectTo` without env vars
`registerAction` calls `siteOrigin()` which reads `x-forwarded-host` / `x-forwarded-proto` request headers. This resolves to the correct domain for every environment (local, Vercel preview, prod) with no per-environment configuration.

### Voting lives only on post detail
Votes are intentionally excluded from the feed (`/`) to reduce cognitive load on the list view. `PostCard` shows a read-only score. `VoteButtons` only appears on `/posts/[id]`.

### Comments
`comments` is a second migration (`0002_comments.sql`). Until `pnpm db:gen` is re-run after applying that migration, `lib/queries/comments.ts` and `lib/actions/comments.ts` use `as any` casts on the Supabase client. After regeneration these casts can be removed.

## Estimated limits (ballpark)

All figures assume the **Supabase free tier** (500 MB DB, 50k MAUs, no dedicated connection pooler) and **Vercel Hobby** (100 GB bandwidth, 100k serverless invocations/day).

### Users
- **~50k monthly active users** before Supabase Auth's free-tier MAU cap is hit.
- Upgrading to Supabase Pro ($25/mo) removes the MAU cap entirely.

### Posts & comments
- A typical post row (title + short body + metadata) is ~1–2 KB. At 500 MB DB headroom that's roughly **250k–500k posts** before storage becomes a concern.
- Comments are smaller (~0.5 KB each); you could have several million before DB size is the bottleneck.
- The feed query (`listPosts`) has **no pagination** — it fetches all rows and sorts in Postgres. Performance degrades noticeably past ~**5k–10k posts**. Cursor/keyset pagination is the fix.

### Voting
- The `votes_score_sync` trigger runs a row-level `UPDATE` on `posts` for every vote. Under concurrent load this creates write contention on hot posts. Fine up to ~**a few hundred votes/minute**; beyond that, a queue or batch-update approach is needed.

### Concurrent connections
- Supabase free uses a shared PgBouncer pool. Vercel serverless functions each open a connection; at high concurrency you'll hit the **~60 direct connection limit**. Supabase's built-in pooler (transaction mode) is the first mitigation; Supabase Pro raises the limit.

### Image storage
- **Supported via Supabase Storage.** Post bodies are Markdown text; images are embedded as `![alt](url)` links pointing to the public `post-images` bucket. Uploads happen client-side (browser → Supabase Storage direct, RLS-enforced). No `storage_path` column on `posts` — the URL lives inline in the Markdown body. See [`RICH_BODY_EDITOR.md`](./RICH_BODY_EDITOR.md) for the full design.

### Search
- **No full-text search.** The feed is sorted by score/date/hot-rank; there is no `LIKE` or `tsvector` query. Postgres full-text search (a `to_tsvector` index on `title || body`) or an external index (Algolia, Typesense) would be needed.

### When to upgrade
| Trigger | Action |
|---|---|
| > 50k MAUs | Supabase Pro (removes MAU cap) |
| Feed feels slow | Add cursor pagination to `listPosts` |
| Post count > ~10k | Add `LIMIT`/cursor to feed query + index tuning |
| Vote contention on viral posts | Batch score updates or move to a queue |
| Need images | Supabase Storage + `storage_path` column |
