-- Attachments on support messages (screenshots, photos, PDF). Private bucket; each user uploads into their own folder.
-- Stored on the ticket as "path::original name". Readable by the sender and by the platform owner only.
alter table public.support_tickets add column if not exists files text[] not null default '{}'
  check (cardinality(files) <= 5);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-files', 'support-files', false, 10485760,
        array['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "support files: own upload" on storage.objects;
create policy "support files: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'support-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "support files: sender or owner reads" on storage.objects;
create policy "support files: sender or owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'support-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_platform_admin()));

-- the owner's list now also returns the attachments
drop function if exists public.platform_tickets();
create function public.platform_tickets()
returns table (id uuid, office_name text, user_name text, user_email text, kind text, subject text, body text,
               page text, status text, reply text, replied_at timestamptz, created_at timestamptz, files text[])
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select t.id, o.name, m.display_name, u.email::text, t.kind, t.subject, t.body, t.page, t.status, t.reply, t.replied_at, t.created_at, t.files
  from support_tickets t
  left join offices o on o.id = t.office_id
  left join members m on m.office_id = t.office_id and m.user_id = t.user_id
  left join auth.users u on u.id = t.user_id
  order by (t.status = 'open') desc, t.created_at desc
  limit 300;
end $$;
revoke all on function public.platform_tickets() from public, anon;
grant execute on function public.platform_tickets() to authenticated;
