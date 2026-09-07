-- Storage bucket for uploaded seed-keyword CSV/XLSX exports (step 6 of the
-- workflow). Private bucket — files are only reachable via signed URLs
-- generated server-side, never public.
insert into storage.buckets (id, name, public)
values ('seed-keyword-csvs', 'seed-keyword-csvs', false)
on conflict (id) do nothing;

-- Objects are stored under `${user_id}/...` so ownership can be checked
-- from the path itself without a extra join back to niches.
create policy "seed_keyword_csvs select own or admin" on storage.objects
  for select using (
    bucket_id = 'seed-keyword-csvs'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "seed_keyword_csvs insert own" on storage.objects
  for insert with check (
    bucket_id = 'seed-keyword-csvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "seed_keyword_csvs delete own or admin" on storage.objects
  for delete using (
    bucket_id = 'seed-keyword-csvs'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
