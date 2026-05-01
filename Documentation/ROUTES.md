# Routes

| Route | Access | Server actions | Queries | Notes |
|---|---|---|---|---|
| `/` | public | — | `listPosts(sort)` | `?sort=hot\|new\|top`; defaults to `hot`. Read-only score shown; no vote buttons in feed. |
| `/posts/new` | auth required | `createPostAction` | — | middleware redirects anon to `/login` |
| `/posts/[id]` | public | `deletePostAction`, `castVoteAction`, `addCommentAction` | `getPostById`, `getUserVoteForPost`, `getCommentsByPostId` | Vote buttons + delete at bottom of post; comment form below; delete visible to owner only |
| `/login` | public | `loginAction` | — | Detects "email not confirmed" → redirects to `/register/confirm`; includes "Forgot password?" link |
| `/login/forgot-password` | public | `forgotPasswordAction` | — | Email form; always redirects to `/login/forgot-password/sent` regardless of whether the email exists (prevents enumeration) |
| `/login/forgot-password/sent` | public | — | — | "Check your email" page shown after requesting a reset link |
| `/login/reset-password` | public (recovery session only) | `resetPasswordAction` | — | New-password + confirm form; action rejects requests without the `pw_reset_pending` cookie (set only by `/callback` on recovery flow) |
| `/register` | public | `registerAction` | — | On success → redirects to `/register/confirm` |
| `/register/confirm` | public | — | — | "Check your email" page; shown after registration and when login attempted before confirmation |
| `/callback` | public | — | — | Supabase PKCE code exchange; handles both email confirmation and password recovery. Sets `pw_reset_pending` httpOnly cookie (15 min TTL) when `next=/login/reset-password`. Set as redirect URL in Supabase Auth dashboard |

## Auth redirect flow

```
Register → /register/confirm ("check your email")
  ↓ user clicks confirmation link in email
/callback → / (logged in)

Login before confirming email → /register/confirm ("check your email")

Forgot password → /login/forgot-password/sent ("check your email")
  ↓ user clicks reset link in email
/callback?next=/login/reset-password  [sets pw_reset_pending cookie]
  → /login/reset-password
    ↓ submit new password (resetPasswordAction checks + consumes cookie)
    → / (logged in)
```

### Security note — reset-password gate

`resetPasswordAction` requires the `pw_reset_pending` cookie, which is set **only** by `/callback` when it processes a recovery link. This prevents an attacker at an unlocked logged-in computer from navigating directly to `/login/reset-password` and changing the password using the existing session. The cookie is httpOnly, SameSite=Lax, and expires after 15 minutes; it is deleted after one successful use.

## Post detail layout

```
/posts/[id]
  <article>
    title + author/date
    body (optional)
    [border-top row] VoteButtons | DeleteButton (owner only)
  </article>
  <section> comments
    count heading
    comment list (author, date, body)
    CommentForm  (logged in) | "Log in to leave a comment" (anon)
  </section>
```
