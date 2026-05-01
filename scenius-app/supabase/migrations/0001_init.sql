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

-- hot-rank view keeps SELECT ergonomic — avoids repeating the formula everywhere
create view public.posts_hot as
  select
    *,
    (
      log(greatest(abs(score), 1))
      + (extract(epoch from created_at) - 1700000000) / 45000.0
    ) as hot_rank
  from public.posts;

-- RLS
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

-- votes: anyone can read; user manages their own row
create policy votes_select_all on public.votes for select using (true);
create policy votes_insert_own on public.votes for insert with check (auth.uid() = user_id);
create policy votes_update_own on public.votes for update using (auth.uid() = user_id);
create policy votes_delete_own on public.votes for delete using (auth.uid() = user_id);
