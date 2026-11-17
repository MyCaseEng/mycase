-- Repair: numbers issued before the new system (ref_text empty) or without the registration number
-- are rewritten with the office's pattern. Same sequence, year and code. Safe to run again.
alter table public.ref_numbers disable trigger ref_numbers_lock;
update public.ref_numbers r
   set ref_text = public.format_ref(o.ref_pattern, o.expert_reg, r.category, r.seq, r.year,
                                    (select c.case_no from public.cases c where c.id = r.case_id))
  from public.offices o
 where o.id = r.office_id
   and coalesce(trim(o.expert_reg), '') <> ''
   and (r.ref_text is null
        or (o.ref_pattern like '%{قيد}%' and position(trim(o.expert_reg) in r.ref_text) = 0));
alter table public.ref_numbers enable trigger ref_numbers_lock;

-- result shown under the query: each office, its registration number and its latest numbers
select o.name as "المكتب", o.expert_reg as "رقم القيد", r.category as "المستند", r.ref_text as "الرقم المرجعي"
  from public.ref_numbers r join public.offices o on o.id = r.office_id
 order by r.issued_at desc limit 20;
