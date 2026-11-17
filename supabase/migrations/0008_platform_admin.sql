-- Platform owner view: who opened an office, when, where, and how much they use it.
-- Owners see each office's summary and counts only, never the content of its cases.

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;  -- no policies: reached only through the functions below

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function public.platform_offices()
returns table (
  id uuid, name text, expert_name text, country text, specialty text, is_active boolean, created_at timestamptz,
  admin_name text, admin_email text, members int, cases int, open_cases int, imports int,
  last_activity timestamptz, last_sign_in timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select o.id, o.name, o.expert_name, o.country, o.specialty, o.is_active, o.created_at,
    adm.display_name, adm.email::text,
    (select count(*)::int from members m where m.office_id = o.id and m.is_active),
    (select count(*)::int from cases c where c.office_id = o.id and c.deleted_at is null),
    (select count(*)::int from cases c where c.office_id = o.id and c.deleted_at is null
       and c.report_date is null and c.status <> 'تم التسليم'),
    (select count(*)::int from activity a where a.office_id = o.id and a.action = 'استيراد ملف PDF'),
    (select max(a.created_at) from activity a where a.office_id = o.id),
    (select max(u.last_sign_in_at) from members m join auth.users u on u.id = m.user_id where m.office_id = o.id)
  from offices o
  left join lateral (
    select m.display_name, u.email from members m join auth.users u on u.id = m.user_id
    where m.office_id = o.id and m.role = 'admin' order by m.created_at limit 1
  ) adm on true
  order by o.created_at desc;
end $$;

revoke all on function public.platform_offices() from public, anon;
grant execute on function public.platform_offices() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
