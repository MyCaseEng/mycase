-- When a subscription ends: 7 days of grace with full use, then read-only until it is renewed.
-- Read-only = members can still open and export everything, but cannot add or change case data.
create or replace function public.sub_locked(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select (case when s.cancelled_at is not null then s.cancelled_at
                 else greatest(s.trial_ends, coalesce(s.paid_until, s.trial_ends)) end) + 7 < current_date
    from subscriptions s where s.office_id = p_office
  ), false);
$$;

create or replace function public.can_write(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m join offices o on o.id = m.office_id
                 where m.office_id = p_office and m.user_id = auth.uid() and m.is_active and o.is_active
                   and m.role in ('admin','member'))
     and not public.sub_locked(p_office);
$$;

revoke all on function public.sub_locked(uuid) from public, anon;
grant execute on function public.sub_locked(uuid) to authenticated;
