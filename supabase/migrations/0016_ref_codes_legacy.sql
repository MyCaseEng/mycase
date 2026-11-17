-- Letter codes also for the document names used before the standard forms, and a short code
-- (first letter of the first two words) for any other name, so a full name never appears in a number.
create or replace function public.ref_code(p_cat text) returns text language sql immutable as $$
  select case trim(coalesce(p_cat, ''))
    when 'إخطار بدء المأمورية' then 'إخ'
    when 'إشعار بمباشرة المأمورية' then 'إخ'
    when 'أسئلة واستفسارات' then 'أس'
    when 'طلب توضيحات' then 'أس'
    when 'محضر اجتماع' then 'اج'
    when 'محضر معاينة' then 'مع'
    when 'طلب تأجيل' then 'تأ'
    when 'طلب إعادة تقدير الأمانة' then 'أم'
    when 'طلب زيادة أمانة' then 'أم'
    when 'طلب تأجيل وإعادة تقدير الأمانة' then 'تأم'
    when 'محضر استلام مستندات' then 'اس'
    when 'محضر تسليم مستندات' then 'تس'
    when 'تقرير خبرة' then 'تق'
    when 'تقرير محكمة' then 'تق'
    when 'تقرير تكميلي' then 'تك'
    when 'كتاب' then 'كت'
    when 'أخرى' then 'أخ'
    when '' then ''
    else (select string_agg(left(w, 1), '' order by i)
            from unnest((regexp_split_to_array(trim(p_cat), '\s+'))[1:2]) with ordinality as t(w, i))
  end
$$;

-- rewrite numbers that still carry a full document name (same sequence and year)
alter table public.ref_numbers disable trigger ref_numbers_lock;
update public.ref_numbers r
   set ref_text = public.format_ref(o.ref_pattern, o.expert_reg, r.category, r.seq, r.year,
                                    (select c.case_no from public.cases c where c.id = r.case_id))
  from public.offices o
 where o.id = r.office_id
   and coalesce(trim(o.expert_reg), '') <> ''
   and o.ref_pattern like '%{نوع}%'
   and r.ref_text is not null
   and position(trim(r.category) in r.ref_text) > 0
   and public.ref_code(r.category) <> trim(r.category);
alter table public.ref_numbers enable trigger ref_numbers_lock;

select o.name as "المكتب", r.category as "المستند", r.ref_text as "الرقم المرجعي"
  from public.ref_numbers r join public.offices o on o.id = r.office_id
 order by r.issued_at desc limit 20;
