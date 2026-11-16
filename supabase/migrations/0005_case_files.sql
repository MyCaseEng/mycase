-- MyCase — step 7: store each imported PDF with its case (private bucket, one folder per office).
-- Path convention: <office_id>/<case_id or "imports">/<file>.pdf

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-files', 'case-files', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy "case files: members read" on storage.objects for select to authenticated
  using (bucket_id = 'case-files' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "case files: team uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'case-files' and public.can_write(((storage.foldername(name))[1])::uuid));
create policy "case files: team moves" on storage.objects for update to authenticated
  using (bucket_id = 'case-files' and public.can_write(((storage.foldername(name))[1])::uuid));
create policy "case files: admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'case-files' and public.is_office_admin(((storage.foldername(name))[1])::uuid));
