-- 1) A sample case, created with each new office so the expert can explore the platform with real-looking data.
alter table public.cases add column if not exists is_sample boolean not null default false;

-- 2) The free trial starts when the expert chooses it (a window shown 24 hours after the office is created).
--    trial_ends set at creation stays as a safety net; choosing the trial gives 30 days from that day.
alter table public.subscriptions add column if not exists trial_started date;
update public.subscriptions set trial_started = current_date where trial_started is null
  and office_id in (select id from public.offices where created_at < now() - interval '1 hour');

create or replace function public.start_trial()
returns date language plpgsql security definer set search_path = public as $$
declare v_office uuid; v_end date;
begin
  select m.office_id into v_office from members m
   where m.user_id = auth.uid() and m.is_active and m.role = 'admin' order by m.created_at limit 1;
  if v_office is null then raise exception 'لمدير المكتب فقط' using errcode = '42501'; end if;
  update subscriptions set trial_started = current_date, trial_ends = greatest(trial_ends, current_date + 29), updated_at = now()
   where office_id = v_office and trial_started is null;
  select trial_ends into v_end from subscriptions where office_id = v_office;
  return v_end;
end $$;
revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- 3) Subscription requests arrive with the support messages
alter table public.support_tickets drop constraint if exists support_tickets_kind_check;
alter table public.support_tickets add constraint support_tickets_kind_check
  check (kind in ('problem', 'suggestion', 'question', 'subscription'));
