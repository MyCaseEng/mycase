-- The {نوع} token writes the document's letter code (اج، مع…) instead of its full name.
create or replace function public.ref_code(p_cat text) returns text language sql immutable as $$
  select case trim(coalesce(p_cat, ''))
    when 'إخطار بدء المأمورية' then 'إخ'
    when 'أسئلة واستفسارات' then 'أس'
    when 'محضر اجتماع' then 'اج'
    when 'محضر معاينة' then 'مع'
    when 'طلب تأجيل' then 'تأ'
    when 'طلب إعادة تقدير الأمانة' then 'أم'
    when 'طلب تأجيل وإعادة تقدير الأمانة' then 'تأم'
    when 'محضر استلام مستندات' then 'اس'
    when 'محضر تسليم مستندات' then 'تس'
    when 'تقرير خبرة' then 'تق'
    when 'تقرير تكميلي' then 'تك'
    when 'كتاب' then 'كت'
    when 'أخرى' then 'أخ'
    else trim(coalesce(p_cat, ''))
  end;
$$;

create or replace function public.format_ref(p_pattern text, p_reg text, p_cat text, p_seq int, p_year int, p_case_no text)
returns text language plpgsql immutable as $$
declare t text := coalesce(nullif(trim(p_pattern), ''), '{قيد}/{نوع}/{تسلسل}/{سنة}');
begin
  t := replace(t, '{قيد}', coalesce(trim(p_reg), ''));
  t := replace(t, '{نوع}', public.ref_code(p_cat));
  t := replace(t, '{تسلسل}', lpad(p_seq::text, 3, '0'));
  t := replace(t, '{سنة2}', right(p_year::text, 2));
  t := replace(t, '{سنة}', p_year::text);
  t := replace(t, '{رقم_الدعوى}', coalesce(trim(p_case_no), ''));
  t := regexp_replace(t, '([/\-_.])\s*(\1\s*)+', '\1', 'g');
  t := regexp_replace(t, '^\s*[/\-_.]\s*|\s*[/\-_.]\s*$', '', 'g');
  return trim(t);
end $$;
