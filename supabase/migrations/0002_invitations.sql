-- MyCase — step 3: team invitations by email (no service key needed).
-- The admin invites an email; when that person signs in, accept_invitations() adds them to the office.

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references public.offices(id) on delete cascade,
  email        text not null,
  role         text not null default 'member' check (role in ('admin','member','viewer')),
  display_name text not null,
  invited_by   uuid references auth.users(id) default auth.uid(),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  unique (office_id, email)
);
create or replace function public.invitations_lower_email() returns trigger language plpgsql as $$
begin new.email := lower(trim(new.email)); return new; end $$;
create trigger invitations_email before insert or update on public.invitations
  for each row execute function public.invitations_lower_email();

alter table public.invitations enable row level security;
create policy inv_admin on public.invitations for all
  using (is_office_admin(office_id)) with check (is_office_admin(office_id));

-- Called after every sign-in: joins every office that invited this user's (verified) email.
create or replace function public.accept_invitations()
returns int language plpgsql security definer set search_path = public as $$
declare
  em text := lower((select email from auth.users where id = auth.uid()));
  n int := 0;
  r invitations;
begin
  if auth.uid() is null or em is null then return 0; end if;
  for r in select * from invitations where email = em and accepted_at is null loop
    insert into members(office_id, user_id, role, display_name)
      values (r.office_id, auth.uid(), r.role, r.display_name)
      on conflict (office_id, user_id) do update set is_active = true, role = excluded.role;
    update invitations set accepted_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- An admin must not lock the office out: keep at least one active admin.
create or replace function public.keep_one_admin() returns trigger language plpgsql
security definer set search_path = public as $$
declare o uuid := coalesce(old.office_id, new.office_id);
begin
  if exists (select 1 from offices where id = o)
     and not exists (select 1 from members where office_id = o and role = 'admin' and is_active) then
    raise exception 'المكتب يحتاج مديراً واحداً على الأقل';
  end if;
  return null;
end $$;
create constraint trigger members_keep_admin after update or delete on public.members
  deferrable initially immediate for each row execute function public.keep_one_admin();

revoke all on function public.accept_invitations() from public, anon;
grant execute on function public.accept_invitations() to authenticated;
