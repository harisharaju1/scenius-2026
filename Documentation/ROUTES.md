# Routes

> Populated as routes land. Each row: route → access → server actions → queries → notes.

| Route | Access | Server actions | Queries | Notes |
|---|---|---|---|---|
| `/` | public | — | — | placeholder; sort-aware feed lands in Phase 4 |
| `/login` | public | `loginAction` | — | react-hook-form + zod client validation |
| `/register` | public | `registerAction` | — | creates auth user; trigger writes `profiles` row |
| `/callback` | public | — | — | Supabase code exchange for email confirmation; set as redirect URL in Supabase Auth dashboard |
