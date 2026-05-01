-- public bucket for images embedded in posts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- authenticated users may upload to their own subfolder only
create policy "authenticated users can upload post images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- public read
create policy "public can read post images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'post-images');

-- users may delete their own images
create policy "users can delete their own post images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
