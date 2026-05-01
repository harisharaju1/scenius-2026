# Rich Body Editor — image drag-and-drop + code blocks

Feature added to the post creation form: users can embed images by dragging them into the body textarea, insert code blocks via a toolbar button, and the post detail page renders the body as Markdown.

---

## Files

| File | Role |
|---|---|
| `components/posts/rich-body-editor.tsx` | Client Component — drag/drop, upload, toolbar, controlled textarea |
| `components/posts/post-body.tsx` | Server-renderable Component — Markdown → styled HTML |
| `components/posts/post-form.tsx` | Updated to use `RichBodyEditor` instead of plain `Textarea` |
| `app/posts/[id]/page.tsx` | Updated to render body via `PostBody` |
| `supabase/migrations/0003_storage.sql` | Creates the `post-images` bucket and RLS policies |

---

## Architecture decisions

### Client-side upload, not a Server Action

Images are uploaded directly from the browser to Supabase Storage using the **browser Supabase client** (`lib/supabase/client.ts`). This is intentional:

- Supabase Storage supports authenticated uploads from the browser without a server relay.
- Uploading through a Server Action would add an extra network hop (browser → Next.js server → Supabase) and double the data transfer, with no security benefit — RLS policies on `storage.objects` enforce the same user-scoping at the database level.
- File sizes up to 5 MB are allowed; Next.js Server Actions have their own body size limits that would need tuning for larger files.

The upload path is `{userId}/{timestamp}-{random}.{ext}`, which satisfies the RLS policy that restricts each user to their own subfolder.

### Controlled textarea, not an uncontrolled register ref

The original `PostForm` used `react-hook-form`'s `register('body')` which binds directly to the DOM element via a ref and reads its value on submit. Switching to `watch('body')` + `setValue('body', v)` makes the field **controlled** — React owns the value in state, and the editor can insert text programmatically (at cursor position) after an async upload completes.

This is the correct pattern when external mutations (uploads, toolbar inserts) need to update the field value asynchronously without relying on the DOM value being in sync.

### insertAtCursor — why `requestAnimationFrame`

After calling `onChange(newValue)` (which schedules a React re-render), the textarea's `.value` in the DOM is still the old string until the render commits. `requestAnimationFrame` defers the cursor-position assignment until after the next paint, by which point the DOM reflects the new value. Without this, `selectionStart`/`selectionEnd` assignments would be overwritten when React reconciles.

### Storage RLS: subfolder-scoped, not object-owner-scoped

Supabase Storage RLS policies use `storage.foldername(name)[1]` — the first path segment — rather than a separate `owner` column. This means:

- The bucket is **public**: any client can read any object without a signed URL.
- Upload and delete are restricted to objects whose path starts with the authenticated user's UUID.
- There is no column that stores the uploader's identity; the path itself is the access control boundary. This keeps the storage schema simple and avoids a join to `auth.users`.

### Markdown stored as raw text, rendered at read time

Post bodies are stored as plain Markdown text in `posts.body` (unchanged `text` column). Rendering is done client-side by `react-markdown` at read time. This approach:

- Requires no schema change and no migration to the `posts` table.
- Keeps the stored value human-readable in the database.
- Means rendering cost scales with reads, not writes — acceptable for a read-heavy feed.
- Allows the rendering style to be updated (e.g. adding syntax highlighting) without touching stored data.

An alternative (HTML sanitisation + storage) was rejected because it would require a sanitiser library, increases stored data size, and ties the presentation layer to the stored format.

### PostBody is a plain component, not a Client Component

`PostBody` has no interactivity and no browser-only APIs. It only transforms a string to JSX via `react-markdown`. Keeping it as a plain (server-renderable) component means it can be used inside Server Components and participates in Next.js streaming without forcing a client bundle download for the rendering logic.

`react-markdown` is pure JS with no DOM dependency; it renders safely on the server.

### Drag-and-drop on the wrapper `div`, not the `textarea`

Native `<textarea>` elements fire `dragover`/`drop` events but browsers intercept file drops into text areas inconsistently (some insert the filename as text). Attaching the drag handlers to the containing `div` and calling `e.preventDefault()` on `dragover` suppresses browser default behaviour reliably across all major browsers. The textarea itself is untouched — it stays a plain `<textarea>`.

`onDragLeave` uses `e.currentTarget.contains(e.relatedTarget)` to distinguish "moved to a child element" (no-op) from "left the drop zone entirely" (clear the drag state). Without this check, moving the mouse across internal DOM nodes flickers the drag indicator.

---

## Storage bucket

Migration: `supabase/migrations/0003_storage.sql`

| Property | Value |
|---|---|
| Bucket ID | `post-images` |
| Public | `true` (objects served at a stable public URL, no signed URL needed) |
| File size limit | 5 MB |
| Allowed MIME types | `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp` |

### RLS policies on `storage.objects`

| Policy | Operation | Condition |
|---|---|---|
| `authenticated users can upload post images` | `INSERT` | `bucket_id = 'post-images'` AND first path segment equals `auth.uid()` |
| `public can read post images` | `SELECT` | `bucket_id = 'post-images'` |
| `users can delete their own post images` | `DELETE` | `bucket_id = 'post-images'` AND first path segment equals `auth.uid()` |

`UPDATE` is intentionally not granted. Images are write-once; if a user wants to change an image in a post body they upload a new one and edit the Markdown.

---

## Markdown rendering — component map

`PostBody` passes custom component renderers to `react-markdown` to apply Tailwind classes. The only non-trivial renderer is `code`:

```
inline code  →  <code>  (no className)  →  highlighted bg pill
code block   →  <pre><code className="language-*">  →  code gets no pill; pre has the bg
```

The distinction is made by checking whether `className` is set on the `code` element. `react-markdown` v10 assigns `language-{lang}` to code blocks but leaves inline `code` elements classless.

---

## Data flow

```
User drops image
  └─ handleDrop (RichBodyEditor)
       ├─ supabase.storage.from('post-images').upload(path, file)
       │    └─ RLS: insert allowed iff path[0] === auth.uid()
       ├─ getPublicUrl(path) → stable https URL (no expiry)
       └─ insertAtCursor(`![image](url)\n`)
            └─ onChange(newValue) → setValue('body', v) → react-hook-form state

User submits form
  └─ createPostAction(formData)
       └─ supabase.from('posts').insert({ body: markdownString })
            └─ body stored as raw Markdown text

Browser renders post detail
  └─ PostBody({ body })
       └─ ReactMarkdown
            └─ img node → <img src={supabasePublicUrl} />
```

---

## Deployment checklist

1. Run `pnpm db:push` — this applies `0003_storage.sql` and creates the `post-images` bucket via the Supabase CLI migration tracker. Do **not** run the SQL manually in the dashboard; doing so bypasses migration tracking and will cause `create policy` errors on the next `db:push`.
2. Verify the bucket appears under **Storage** in the Supabase dashboard.
3. Verify the three RLS policies appear under **Storage → Policies**.
4. Confirm `pnpm typecheck` passes (it does as of the implementation commit).
