-- tracks which storage objects belong to each post
-- rows cascade-delete when the post is deleted; deletePostAction then removes
-- the corresponding objects from the post-images bucket
create table post_images (
  id         bigserial primary key,
  post_id    bigint      not null references posts(id) on delete cascade,
  storage_path text      not null,
  created_at timestamptz not null default now()
);

alter table post_images enable row level security;

-- server action runs as the authenticated user; allow recording images for their own posts
create policy "post author can insert post_images"
  on post_images for insert to authenticated
  with check (
    exists (
      select 1 from posts where id = post_images.post_id and author_id = auth.uid()
    )
  );

-- needed by deletePostAction to read paths before removing storage objects
create policy "post author can select post_images"
  on post_images for select to authenticated
  using (
    exists (
      select 1 from posts where id = post_images.post_id and author_id = auth.uid()
    )
  );
