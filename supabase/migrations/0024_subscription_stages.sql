-- Subscription stages (replaces the 7-day rule of 0023). The last day of a period is a full day; the change starts the next morning.
--   free trial : 30 days full → 3 days read + export → view only
--   paid       : period full  → 3 days full (grace) → 4 days read + export → view only
-- "full" = everything; "export" = read and download, no changes; "view" = look only (no changes, no downloads).
create or replace function public.sub_stage(p_office uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare s subscriptions%rowtype; v_end date; past int; trial boolean;
begin
  select * into s from subscriptions where office_id = p_office;
  if not found then return 'full'; end if;
  trial := s.cancelled_at is null and (s.paid_until is null or s.paid_until < s.trial_ends);
  v_end := case when s.cancelled_at is not null then s.cancelled_at else greatest(s.trial_ends, coalesce(s.paid_until, s.trial_ends)) end;
  past := current_date - v_end;
  if past <= 0 then return 'full'; end if;
  if trial then return case when past <= 3 then 'export' else 'view' end; end if;
  return case when past <= 3 then 'full' when past <= 7 then 'export' else 'view' end;
end $$;

create or replace function public.sub_locked(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.sub_stage(p_office) <> 'full';
$$;

-- files can be downloaded in every stage except "view"
drop policy if exists "case files: members read" on storage.objects;
create policy "case files: members read" on storage.objects for select to authenticated
  using (bucket_id = 'case-files' and public.is_member(((storage.foldername(name))[1])::uuid)
         and public.sub_stage(((storage.foldername(name))[1])::uuid) <> 'view');

-- the trial is 30 days counting the day the office is created
create or replace function public.office_trial() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (office_id, trial_ends) values (new.id, (new.created_at at time zone 'utc')::date + 29)
  on conflict (office_id) do nothing;
  return new;
end $$;

-- a payment continues from the end of the current period (also during the 7 days after it);
-- after that it starts on the day of payment
create or replace function public.platform_renew(p_office uuid, p_months int, p_amount numeric, p_paid_on date, p_note text)
returns date language plpgsql security definer set search_path = public as $$
declare base date; v_until date;
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(p_months, 0) < 1 then raise exception 'عدد الأشهر غير صحيح'; end if;
  select greatest(trial_ends, coalesce(paid_until, trial_ends)) into base from subscriptions where office_id = p_office;
  if base is null then raise exception 'لا يوجد اشتراك لهذا المكتب'; end if;
  if p_paid_on - base > 7 then base := p_paid_on - 1; end if;
  v_until := (base + make_interval(months => p_months))::date;
  update subscriptions set paid_until = v_until, cancelled_at = null, cancel_reason = null, updated_at = now() where office_id = p_office;
  insert into subscription_payments (office_id, amount, months, paid_on, until, note)
  values (p_office, p_amount, p_months, p_paid_on, v_until, nullif(trim(p_note), ''));
  return v_until;
end $$;

revoke all on function public.sub_stage(uuid) from public, anon;
grant execute on function public.sub_stage(uuid) to authenticated;
