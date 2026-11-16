-- MyCase — step 4: align "who assigned the expert" keys with the prototype, and a default for party side.
alter table public.cases drop constraint if exists cases_assign_src_check;
alter table public.cases add constraint cases_assign_src_check
  check (assign_src is null or assign_src in ('court','rent','assoc','panel','none'));
