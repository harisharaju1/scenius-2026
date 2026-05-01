# Routes

> Populated as routes land. Each row: route → access → server actions → queries → notes.

| Route | Access | Server actions | Queries | Notes |
|---|---|---|---|---|
| `/` | public | — | `listPosts(sort)` | `?sort=hot\|new\|top`; defaults to hot |
| `/posts/new` | auth required | `createPostAction` | — | middleware redirects anon to `/login` |
| `/posts/[id]` | public | `deletePostAction` | `getPostById(id)` | delete button visible only to owner |
| `/login` | public | `loginAction` | — | react-hook-form + zod client validation |
| `/register` | public | `registerAction` | — | creates auth user; trigger writes `profiles` row |
| `/callback` | public | — | — | Supabase code exchange for email confirmation; set as redirect URL in Supabase Auth dashboard |
