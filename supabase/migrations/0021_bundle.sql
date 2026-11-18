-- The documents bundle of the report (حافظة المستندات): an index of what was handed in, by whom and when,
-- plus one link to the full bundle (WeTransfer, OneDrive…) and the final files kept with the case.
create table if not exists public.bundle_items (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  office_id   uuid not null references public.offices(id) on delete cascade,
  grp         text not null check (grp in ('court', 'reply', 'minutes', 'party')),
  party_id    uuid references public.parties(id) on delete set null,
  provider    text not null default '',   -- «تم تزويدنا بها من قبل»
  title       text not null,
  doc_date    text not null default '',   -- a date, «تواريخ مختلفة» or «-»
  sort        int not null default 0,
  auto_key    text,                        -- rows the platform proposed (judgment, replies, minutes)
  created_at  timestamptz not null default now()
);
create unique index if not exists bundle_items_auto on public.bundle_items(case_id, auto_key) where auto_key is not null;
create index if not exists bundle_items_case on public.bundle_items(case_id);

create table if not exists public.case_final (
  case_id     uuid primary key references public.cases(id) on delete cascade,
  office_id   uuid not null references public.offices(id) on delete cascade,
  bundle_link text,
  report_path text,   -- signed report (PDF)
  bundle_path text,   -- short bundle (PDF)
  word_path   text,   -- the report in Word
  updated_at  timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['bundle_items', 'case_final'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('drop policy if exists %I_upd on public.%I', t, t);
    execute format('drop policy if exists %I_del on public.%I', t, t);
    execute format('create policy %I_read  on public.%I for select using (is_member(office_id))', t, t);
    execute format('create policy %I_write on public.%I for insert with check (can_write(office_id))', t, t);
    execute format('create policy %I_upd   on public.%I for update using (can_write(office_id)) with check (can_write(office_id))', t, t);
    execute format('create policy %I_del   on public.%I for delete using (can_write(office_id))', t, t);
    execute format('drop trigger if exists %I_office on public.%I', t, t);
    execute format('create trigger %I_office before insert or update on public.%I for each row execute function public.check_case_office()', t, t);
  end loop;
end $$;

-- final files: Word as well as PDF and pictures; a signed report can be large
update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
                                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
       file_size_limit = 104857600
 where id = 'case-files';
