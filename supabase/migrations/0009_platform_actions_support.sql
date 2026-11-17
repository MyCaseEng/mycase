-- 1) Suspending an office: its members keep their accounts but can no longer see or change the office's data.
--    The three access helpers now also require the office to be active.
create or replace function public.is_member(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m join offices o on o.id = m.office_id
                 where m.office_id = p_office and m.user_id = auth.uid() and m.is_active and o.is_active);
$$;
create or replace function public.can_write(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m join offices o on o.id = m.office_id
                 where m.office_id = p_office and m.user_id = auth.uid() and m.is_active and o.is_active
                   and m.role in ('admin','member'));
$$;
create or replace function public.is_office_admin(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m join offices o on o.id = m.office_id
                 where m.office_id = p_office and m.user_id = auth.uid() and m.is_active and o.is_active
                   and m.role = 'admin');
$$;
-- everyone can read their own membership rows (so a member of a suspended office is told so, instead of being offered a new office)
drop policy if exists members_self on public.members;
create policy members_self on public.members for select using (user_id = auth.uid());

-- 2) Owner actions on an office
create or replace function public.platform_set_office_active(p_office uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update offices set is_active = p_active where id = p_office;
end $$;

create or replace function public.platform_delete_office(p_office uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from offices where id = p_office and name = p_confirm_name) then
    raise exception 'اسم المكتب غير مطابق';
  end if;
  delete from offices where id = p_office;
end $$;

-- 3) Support: offices write to the platform owner (problem, suggestion, question); the owner replies.
create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid references public.offices(id) on delete set null,
  user_id    uuid references auth.users(id) on delete set null default auth.uid(),
  kind       text not null default 'problem' check (kind in ('problem','suggestion','question')),
  subject    text not null check (length(subject) between 1 and 200),
  body       text not null check (length(body) between 1 and 5000),
  page       text,
  status     text not null default 'open' check (status in ('open','done')),
  reply      text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists support_tickets_status_idx on public.support_tickets(status, created_at desc);
alter table public.support_tickets enable row level security;
-- write: only into an office you belong to (also allowed while the office is suspended)
drop policy if exists support_insert on public.support_tickets;
create policy support_insert on public.support_tickets for insert
  with check (user_id = auth.uid() and status = 'open' and reply is null
              and exists (select 1 from members m where m.office_id = support_tickets.office_id and m.user_id = auth.uid()));
-- read: your own messages and the replies to them
drop policy if exists support_own on public.support_tickets;
create policy support_own on public.support_tickets for select using (user_id = auth.uid());

create or replace function public.platform_tickets()
returns table (id uuid, office_name text, user_name text, user_email text, kind text, subject text, body text,
               page text, status text, reply text, replied_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select t.id, o.name, m.display_name, u.email::text, t.kind, t.subject, t.body, t.page, t.status, t.reply, t.replied_at, t.created_at
  from support_tickets t
  left join offices o on o.id = t.office_id
  left join members m on m.office_id = t.office_id and m.user_id = t.user_id
  left join auth.users u on u.id = t.user_id
  order by (t.status = 'open') desc, t.created_at desc
  limit 300;
end $$;

create or replace function public.platform_answer_ticket(p_id uuid, p_reply text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update support_tickets
     set reply = nullif(trim(p_reply), ''),
         replied_at = case when nullif(trim(p_reply), '') is not null then now() else replied_at end,
         status = case when p_status in ('open','done') then p_status else status end
   where id = p_id;
end $$;

revoke all on function public.platform_set_office_active(uuid, boolean) from public, anon;
revoke all on function public.platform_delete_office(uuid, text) from public, anon;
revoke all on function public.platform_tickets() from public, anon;
revoke all on function public.platform_answer_ticket(uuid, text, text) from public, anon;
grant execute on function public.platform_set_office_active(uuid, boolean) to authenticated;
grant execute on function public.platform_delete_office(uuid, text) to authenticated;
grant execute on function public.platform_tickets() to authenticated;
grant execute on function public.platform_answer_ticket(uuid, text, text) to authenticated;
