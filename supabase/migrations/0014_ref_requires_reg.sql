-- 1) No number is issued without the expert's registration number when the pattern uses it.
create or replace function public.issue_ref_number(p_office uuid, p_category text, p_case uuid default null,
                                                   p_event uuid default null, p_title text default null)
returns public.ref_numbers language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from now())::int;
  n int;
  o offices;
  cno text;
  r ref_numbers;
begin
  if not can_write(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_case is not null and not exists (select 1 from cases where id = p_case and office_id = p_office) then
    raise exception 'case not in office' using errcode = '42501';
  end if;
  select * into o from offices where id = p_office;
  if o.ref_pattern like '%{قيد}%' and coalesce(trim(o.expert_reg), '') = '' then
    raise exception 'NO_REG' using errcode = 'P0001';
  end if;
  if p_case is not null then select case_no into cno from cases where id = p_case; end if;
  insert into ref_counters(office_id, year, last_seq) values (p_office, y, 1)
    on conflict (office_id, year) do update set last_seq = ref_counters.last_seq + 1
    returning last_seq into n;
  insert into ref_numbers(office_id, year, seq, category, case_id, event_id, title, issued_by, ref_text)
    values (p_office, y, n, p_category, p_case, p_event, p_title, auth.uid(),
            format_ref(o.ref_pattern, o.expert_reg, p_category, n, y, cno))
    returning * into r;
  return r;
end $$;

-- 2) One-time repair: numbers already issued without the registration number get it now
--    (only for offices that have since entered it). Same sequence, same year, same code.
alter table public.ref_numbers disable trigger ref_numbers_lock;
update public.ref_numbers r
   set ref_text = public.format_ref(o.ref_pattern, o.expert_reg, r.category, r.seq, r.year,
                                    (select c.case_no from public.cases c where c.id = r.case_id))
  from public.offices o
 where o.id = r.office_id
   and o.ref_pattern like '%{قيد}%'
   and coalesce(trim(o.expert_reg), '') <> ''
   and r.ref_text is not null
   and position(trim(o.expert_reg) in r.ref_text) = 0;
alter table public.ref_numbers enable trigger ref_numbers_lock;
