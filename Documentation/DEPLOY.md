# Deploy

## Prerequisites

- Supabase project already created and migrations applied (`pnpm db:push` from `scenius-app/`)
- GitHub repo with the `scenius-app/` directory pushed
- Vercel account linked to the GitHub repo

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → Publishable key |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → Secret key |

> `NEXT_PUBLIC_*` variables are exposed to the browser. Never put the secret key in a `NEXT_PUBLIC_` variable.

## Supabase Auth redirect URLs

In Supabase → Authentication → URL Configuration:

- **Site URL**: `https://<your-vercel-domain>`
- **Redirect URLs**: add `https://<your-vercel-domain>/callback`

For preview deployments add a wildcard: `https://*-<your-vercel-team>.vercel.app/callback`

## Vercel deploy steps

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `scenius-app`.
3. Framework preset auto-detects as Next.js — leave defaults.
4. Add the three environment variables above.
5. Deploy.

## Smoke test after deploy

Golden path on the live URL:

1. Register a new user (username + email + password).
2. Create a post — redirects to `/posts/<id>`.
3. Upvote the post — score increments optimistically and persists on reload.
4. Log out, register a second user.
5. Log in as second user → downvote the post.
6. Switch sort tabs: hot / new / top — posts reorder correctly.
7. Log back in as first user → delete the post — redirects to feed, post gone.

## Subsequent schema changes

```bash
cd scenius-app
supabase migration new <description>
# edit the new file in supabase/migrations/
pnpm db:push          # applies to the linked Supabase project
pnpm db:gen           # regenerates lib/supabase/types.ts
```

Commit both the migration file and the updated types.
