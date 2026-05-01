# scenius-app

A small Reddit-like app — post, vote, and sort by hot / new / top.

Built with Next.js 15 App Router, Supabase (Postgres + Auth + RLS), Tailwind v4, shadcn/ui, and react-hook-form + zod.

## Local development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase project values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Secret (service role) key — server-only |

### 3. Apply the database schema

```bash
pnpm db:push
```

Or paste `supabase/migrations/0001_init.sql` directly into the Supabase SQL Editor.

### 4. Regenerate types (after schema changes)

```bash
pnpm db:gen
```

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:integration` | Integration tests against Supabase |
| `pnpm test:e2e` | Playwright end-to-end tests (requires `pnpm dev`) |
| `pnpm db:push` | Apply migrations to linked Supabase project |
| `pnpm db:gen` | Regenerate `lib/supabase/types.ts` |

## Deploy

See [`../Documentation/DEPLOY.md`](../Documentation/DEPLOY.md).
