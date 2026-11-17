-- Reference numbers, platform-wide: one running sequence per office per year, written with the office's own pattern.
-- Default pattern: «رقم القيد / نوع المستند / التسلسل / السنة», e.g. 1234/محضر اجتماع/002/2026.
-- Tokens: {قيد} {نوع} {تسلسل} {سنة} {سنة2} {رقم_الدعوى}. The text is fixed when the number is issued.

alter table public.offices add column if not exists ref_pattern text not null default '{قيد}/{نوع}/{تسلسل}/{سنة}'
  check (length(ref_pattern) between 1 and 120 and ref_pattern like '%{تسلسل}%');
alter table public.ref_numbers add column if not exists ref_text text;

create or replace function public.format_ref(p_pattern text, p_reg text, p_cat text, p_seq int, p_year int, p_case_no text)
returns text language plpgsql immutable as $$
declare t text := coalesce(nullif(trim(p_pattern), ''), '{قيد}/{نوع}/{تسلسل}/{سنة}');
begin
  t := replace(t, '{قيد}', coalesce(trim(p_reg), ''));
  t := replace(t, '{نوع}', coalesce(trim(p_cat), ''));
  t := replace(t, '{تسلسل}', lpad(p_seq::text, 3, '0'));
  t := replace(t, '{سنة2}', right(p_year::text, 2));
  t := replace(t, '{سنة}', p_year::text);
  t := replace(t, '{رقم_الدعوى}', coalesce(trim(p_case_no), ''));
  -- an empty token leaves no stray separators behind
  t := regexp_replace(t, '([/\-_.])\s*(\1\s*)+', '\1', 'g');
  t := regexp_replace(t, '^\s*[/\-_.]\s*|\s*[/\-_.]\s*$', '', 'g');
  return trim(t);
end $$;

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

-- the written number is part of what can never change after issue
create or replace function public.ref_only_status() returns trigger language plpgsql as $$
begin
  if (new.office_id, new.year, new.seq, new.issued_by, new.issued_at, new.ref_text) is distinct from
     (old.office_id, old.year, old.seq, old.issued_by, old.issued_at, old.ref_text) then
    raise exception 'issued numbers cannot be changed';
  end if;
  return new;
end $$;
