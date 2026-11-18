-- 1) Subscriptions, kept by hand by the platform owner until online payment comes.
create table if not exists public.subscriptions (
  office_id     uuid primary key references public.offices(id) on delete cascade,
  plan          text not null default 'أساسية',
  price         numeric,                 -- per cycle
  cycle_months  int not null default 12 check (cycle_months > 0),
  trial_ends    date not null,
  paid_until    date,
  cancelled_at  date,
  cancel_reason text,
  note          text,
  updated_at    timestamptz not null default now()
);
create table if not exists public.subscription_payments (
  id         bigint generated always as identity primary key,
  office_id  uuid not null references public.offices(id) on delete cascade,
  amount     numeric,
  months     int not null check (months > 0),
  paid_on    date not null,
  until      date not null,
  note       text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists subscription_payments_office on public.subscription_payments(office_id);
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
-- an office may see its own subscription (no writes: only the owner's functions below change it)
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select using (is_member(office_id));

-- every new office starts a 30-day trial; existing offices get 30 days from today
create or replace function public.office_trial() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (office_id, trial_ends) values (new.id, (new.created_at at time zone 'utc')::date + 30)
  on conflict (office_id) do nothing;
  return new;
end $$;
drop trigger if exists offices_trial on public.offices;
create trigger offices_trial after insert on public.offices for each row execute function public.office_trial();
insert into public.subscriptions (office_id, trial_ends)
  select id, current_date + 30 from public.offices on conflict (office_id) do nothing;

-- 2) Owner functions
create or replace function public.platform_subscriptions()
returns table (office_id uuid, plan text, price numeric, cycle_months int, trial_ends date, paid_until date,
               cancelled_at date, cancel_reason text, note text, paid_total numeric, last_paid date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select s.office_id, s.plan, s.price, s.cycle_months, s.trial_ends, s.paid_until, s.cancelled_at, s.cancel_reason, s.note,
    (select coalesce(sum(p.amount), 0) from subscription_payments p where p.office_id = s.office_id),
    (select max(p.paid_on) from subscription_payments p where p.office_id = s.office_id)
  from subscriptions s;
end $$;

create or replace function public.platform_set_subscription(p_office uuid, p_plan text, p_price numeric, p_cycle int, p_trial_ends date, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into subscriptions (office_id, plan, price, cycle_months, trial_ends, note)
  values (p_office, coalesce(nullif(trim(p_plan), ''), 'أساسية'), p_price, greatest(coalesce(p_cycle, 12), 1), p_trial_ends, nullif(trim(p_note), ''))
  on conflict (office_id) do update set plan = excluded.plan, price = excluded.price, cycle_months = excluded.cycle_months,
    trial_ends = excluded.trial_ends, note = excluded.note, updated_at = now();
end $$;

-- a payment received: extends the subscription from where it ends (or from the payment day if already lapsed)
create or replace function public.platform_renew(p_office uuid, p_months int, p_amount numeric, p_paid_on date, p_note text)
returns date language plpgsql security definer set search_path = public as $$
declare base date; v_until date;
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(p_months, 0) < 1 then raise exception 'عدد الأشهر غير صحيح'; end if;
  select greatest(coalesce(paid_until, p_paid_on), p_paid_on, trial_ends) into base from subscriptions where office_id = p_office;
  if base is null then raise exception 'لا يوجد اشتراك لهذا المكتب'; end if;
  v_until := (base + make_interval(months => p_months))::date;
  update subscriptions set paid_until = v_until, cancelled_at = null, cancel_reason = null, updated_at = now() where office_id = p_office;
  insert into subscription_payments (office_id, amount, months, paid_on, until, note)
  values (p_office, p_amount, p_months, p_paid_on, v_until, nullif(trim(p_note), ''));
  return v_until;
end $$;

create or replace function public.platform_cancel_subscription(p_office uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update subscriptions set cancelled_at = current_date, cancel_reason = nullif(trim(p_reason), ''), updated_at = now() where office_id = p_office;
end $$;

-- business numbers for the owner (counts only, never case content)
create or replace function public.platform_kpis()
returns table (active_offices int, users int, active_users int, trial int, paying int, late int, cancelled_30 int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select
    (select count(distinct a.office_id)::int from activity a where a.created_at > now() - interval '30 days'),
    (select count(distinct m.user_id)::int from members m where m.is_active),
    (select count(distinct m.user_id)::int from members m join auth.users u on u.id = m.user_id
       where m.is_active and u.last_sign_in_at > now() - interval '30 days'),
    (select count(*)::int from subscriptions s where s.cancelled_at is null and s.trial_ends >= current_date
       and (s.paid_until is null or s.paid_until < current_date)),
    (select count(*)::int from subscriptions s where s.cancelled_at is null and s.paid_until >= current_date),
    (select count(*)::int from subscriptions s where s.cancelled_at is null and s.trial_ends < current_date
       and (s.paid_until is null or s.paid_until < current_date)),
    (select count(*)::int from subscriptions s where s.cancelled_at > current_date - 30);
end $$;

-- use of the platform per day over the last N days
create or replace function public.platform_usage(p_days int default 30)
returns table (day date, actions int, users int, offices int, new_cases int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select d::date,
    (select count(*)::int from activity a where a.created_at >= d and a.created_at < d + interval '1 day'),
    (select count(distinct a.actor)::int from activity a where a.created_at >= d and a.created_at < d + interval '1 day'),
    (select count(distinct a.office_id)::int from activity a where a.created_at >= d and a.created_at < d + interval '1 day'),
    (select count(*)::int from cases c where c.created_at >= d and c.created_at < d + interval '1 day')
  from generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day') d
  order by 1;
end $$;

revoke all on function public.platform_subscriptions() from public, anon;
revoke all on function public.platform_set_subscription(uuid, text, numeric, int, date, text) from public, anon;
revoke all on function public.platform_renew(uuid, int, numeric, date, text) from public, anon;
revoke all on function public.platform_cancel_subscription(uuid, text) from public, anon;
revoke all on function public.platform_kpis() from public, anon;
revoke all on function public.platform_usage(int) from public, anon;
grant execute on function public.platform_subscriptions() to authenticated;
grant execute on function public.platform_set_subscription(uuid, text, numeric, int, date, text) to authenticated;
grant execute on function public.platform_renew(uuid, int, numeric, date, text) to authenticated;
grant execute on function public.platform_cancel_subscription(uuid, text) to authenticated;
grant execute on function public.platform_kpis() to authenticated;
grant execute on function public.platform_usage(int) to authenticated;
