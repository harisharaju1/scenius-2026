create table public.comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at asc);

alter table public.comments enable row level security;

create policy comments_select_all on public.comments for select using (true);
create policy comments_insert_authed on public.comments for insert with check (auth.uid() = author_id);
create policy comments_delete_own on public.comments for delete using (auth.uid() = author_id);
