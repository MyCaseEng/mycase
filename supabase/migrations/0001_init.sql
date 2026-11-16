-- MyCase — step 2: schema, office isolation (RLS), atomic reference numbers, append-only activity.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ============ offices & members ============
create table public.offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  expert_name text,
  logo_path   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.members (
  office_id    uuid not null references public.offices(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('admin','member','viewer')),
  display_name text not null,
  short_name   text,
  color        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (office_id, user_id)
);
create index members_user_idx on public.members(user_id);

-- Helpers used by every policy. SECURITY DEFINER so they can read members without recursing into its own RLS.
create or replace function public.is_member(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.office_id = p_office and m.user_id = auth.uid() and m.is_active);
$$;

create or replace function public.can_write(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.office_id = p_office and m.user_id = auth.uid()
                 and m.is_active and m.role in ('admin','member'));
$$;

create or replace function public.is_office_admin(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.office_id = p_office and m.user_id = auth.uid()
                 and m.is_active and m.role = 'admin');
$$;

-- ============ cases ============
create table public.cases (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references public.offices(id) on delete cascade,
  case_no         text,               -- stored as "number - year", e.g. "888 - 2026"
  case_type       text,               -- e.g. "ابتدائي مدني كلي" (no slashes)
  category        text not null default 'محكمة',
  authority       text,
  assign_src      text check (assign_src in ('court','rent','qea','committee') or assign_src is null),
  circuit         text,
  judge           text,
  secretary       text,
  mission         text,
  received        date,
  prelim_date     date,
  deadline        date,
  due_note        text,
  deposit_ordered numeric(14,2),
  claim_value     numeric(16,2),
  project_value   numeric(16,2),
  supplementary   boolean not null default false,
  load_type       text not null default 'عادي',
  status          text not null default 'فعالة',
  report_date     date,               -- date the report was delivered
  source_file     text,               -- storage path of the imported PDF
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz         -- soft delete: trash for 30 days
);
create index cases_office_idx on public.cases(office_id) where deleted_at is null;

create table public.case_team (
  case_id   uuid not null references public.cases(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  duty      text not null check (duty in ('executor','coordinator')),
  primary key (case_id, user_id, duty)
);

create table public.parties (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  office_id     uuid not null references public.offices(id) on delete cascade,
  side          smallint not null default 3 check (side in (1,2,3)), -- 1 claimant, 2 defendant, 3 other
  role          text not null,      -- as written in the judgment
  name          text not null,
  kind          text,               -- شركة / رجل / ...
  phone         text,
  email         text,
  lawyer        text,
  lawyer_phone  text,
  lawyer_email  text,
  sort          int not null default 0
);
create index parties_case_idx on public.parties(case_id);

create table public.events (
  id        uuid primary key default gen_random_uuid(),
  case_id   uuid not null references public.cases(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  type      text not null check (type in ('جلسة','اجتماع','معاينة')),
  date      date not null,
  time      time,
  place     text,
  invited   text not null default 'all',  -- all / 1 / 2
  note      text,
  created_at timestamptz not null default now()
);
create index events_case_idx on public.events(case_id);
create index events_office_date_idx on public.events(office_id, date);

create table public.question_letters (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  office_id   uuid not null references public.offices(id) on delete cascade,
  party_id    uuid references public.parties(id) on delete set null,
  addressee   text,
  letter_date date not null default current_date,
  days        int not null default 5,
  due         date,
  questions   text[] not null default '{}',
  ref_id      uuid,
  sent_at     timestamptz,
  reply_type  text check (reply_type in ('partial','full') or reply_type is null),
  reply_date  date,
  reply_note  text,
  created_at  timestamptz not null default now()
);

-- ============ reference numbers (never deleted, only cancelled) ============
create table public.ref_counters (
  office_id uuid not null references public.offices(id) on delete cascade,
  year      int  not null,
  last_seq  int  not null default 0,
  primary key (office_id, year)
);

create table public.ref_numbers (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references public.offices(id) on delete cascade,
  year       int  not null,
  seq        int  not null,
  category   text not null,
  case_id    uuid references public.cases(id) on delete set null,
  event_id   uuid references public.events(id) on delete set null,
  title      text,
  status     text not null default 'فعال' check (status in ('فعال','ملغى')),
  issued_by  uuid references auth.users(id),
  issued_at  timestamptz not null default now(),
  unique (office_id, year, seq)
);

-- One transaction, row-locked counter: two people issuing at the same moment get two different numbers.
create or replace function public.issue_ref_number(p_office uuid, p_category text, p_case uuid default null,
                                                   p_event uuid default null, p_title text default null)
returns public.ref_numbers language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Qatar'))::int;
  n int;
  r ref_numbers;
begin
  if not can_write(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_case is not null and not exists (select 1 from cases where id = p_case and office_id = p_office) then
    raise exception 'case not in office' using errcode = '42501';
  end if;
  insert into ref_counters(office_id, year, last_seq) values (p_office, y, 1)
    on conflict (office_id, year) do update set last_seq = ref_counters.last_seq + 1
    returning last_seq into n;
  insert into ref_numbers(office_id, year, seq, category, case_id, event_id, title, issued_by)
    values (p_office, y, n, p_category, p_case, p_event, p_title, auth.uid())
    returning * into r;
  return r;
end $$;

-- ============ procedures, notes, snoozes ============
create table public.procedures (
  id        uuid primary key default gen_random_uuid(),
  case_id   uuid not null references public.cases(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  auto_key  text,          -- set when this row overrides an auto-generated line
  date      date,
  body      text,
  hidden    boolean not null default false,
  sort      int not null default 0
);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  office_id  uuid not null references public.offices(id) on delete cascade,
  body       text not null,
  author     uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.alert_snoozes (
  case_id   uuid not null references public.cases(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  alert_key text not null,
  until     date not null,
  primary key (case_id, alert_key)
);

-- ============ activity (append-only) ============
create table public.activity (
  id         bigint generated always as identity primary key,
  office_id  uuid not null references public.offices(id) on delete cascade,
  actor      uuid references auth.users(id) default auth.uid(),
  action     text not null,
  case_id    uuid references public.cases(id) on delete set null,
  case_label text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index activity_office_idx on public.activity(office_id, created_at desc);

-- ============ office settings & templates ============
create table public.office_settings (
  office_id  uuid primary key references public.offices(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,   -- question templates, alert rules, signature...
  updated_at timestamptz not null default now()
);

create table public.templates (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references public.offices(id) on delete cascade,
  kind       text not null,          -- meeting / inspection / report / questions / letter
  assign_src text,                   -- null = default for every source
  file_path  text not null,          -- storage path of the .docx
  updated_at timestamptz not null default now(),
  unique (office_id, kind, assign_src)
);

-- ============ updated_at + child office consistency ============
create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger cases_touch before update on public.cases for each row execute function public.touch();

-- A child row must belong to the same office as its case (blocks cross-office smuggling).
create or replace function public.check_case_office() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if not exists (select 1 from cases c where c.id = new.case_id and c.office_id = new.office_id) then
    raise exception 'case/office mismatch' using errcode = '42501';
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['case_team','parties','events','question_letters','procedures','notes','alert_snoozes'] loop
    execute format('create trigger %I_office before insert or update on public.%I for each row execute function public.check_case_office()', t, t);
  end loop;
end $$;

-- ============ Row Level Security ============
alter table public.offices          enable row level security;
alter table public.members          enable row level security;
alter table public.cases            enable row level security;
alter table public.case_team        enable row level security;
alter table public.parties          enable row level security;
alter table public.events           enable row level security;
alter table public.question_letters enable row level security;
alter table public.ref_counters     enable row level security;
alter table public.ref_numbers      enable row level security;
alter table public.procedures       enable row level security;
alter table public.notes            enable row level security;
alter table public.alert_snoozes    enable row level security;
alter table public.activity         enable row level security;
alter table public.office_settings  enable row level security;
alter table public.templates        enable row level security;

-- offices: members read; admins edit. Creation goes through create_office().
create policy offices_read   on public.offices for select using (is_member(id));
create policy offices_update on public.offices for update using (is_office_admin(id)) with check (is_office_admin(id));

-- members: everyone in the office sees the team; only admins manage it.
create policy members_read  on public.members for select using (is_member(office_id));
create policy members_admin on public.members for all using (is_office_admin(office_id)) with check (is_office_admin(office_id));

-- cases: read for members, write for admin/member; hard delete only by admin (normal delete = set deleted_at).
create policy cases_read   on public.cases for select using (is_member(office_id));
create policy cases_insert on public.cases for insert with check (can_write(office_id));
create policy cases_update on public.cases for update using (can_write(office_id)) with check (can_write(office_id));
create policy cases_delete on public.cases for delete using (is_office_admin(office_id));

-- case children: same rule set
do $$ declare t text; begin
  foreach t in array array['case_team','parties','events','question_letters','procedures','notes','alert_snoozes','templates'] loop
    execute format('create policy %I_read  on public.%I for select using (is_member(office_id))', t, t);
    execute format('create policy %I_write on public.%I for insert with check (can_write(office_id))', t, t);
    execute format('create policy %I_upd   on public.%I for update using (can_write(office_id)) with check (can_write(office_id))', t, t);
    execute format('create policy %I_del   on public.%I for delete using (can_write(office_id))', t, t);
  end loop;
end $$;

-- reference numbers: read for members; issued only via issue_ref_number(); may be cancelled, never deleted.
create policy ref_read   on public.ref_numbers for select using (is_member(office_id));
create policy ref_cancel on public.ref_numbers for update using (can_write(office_id)) with check (can_write(office_id));
create or replace function public.ref_only_status() returns trigger language plpgsql as $$
begin
  if (new.office_id, new.year, new.seq, new.issued_by, new.issued_at) is distinct from
     (old.office_id, old.year, old.seq, old.issued_by, old.issued_at) then
    raise exception 'issued numbers cannot be changed';
  end if;
  return new;
end $$;
create trigger ref_numbers_lock before update on public.ref_numbers for each row execute function public.ref_only_status();
-- ref_counters: no policies at all → only the SECURITY DEFINER function touches it.

-- activity: members read and append their own lines; no update/delete policy exists, so nobody can edit history.
create policy activity_read   on public.activity for select using (is_member(office_id));
create policy activity_insert on public.activity for insert with check (can_write(office_id) and actor = auth.uid());

-- settings: members read, admins write
create policy settings_read  on public.office_settings for select using (is_member(office_id));
create policy settings_write on public.office_settings for all using (is_office_admin(office_id)) with check (is_office_admin(office_id));

-- ============ bootstrap: create an office and become its admin ============
create or replace function public.create_office(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  insert into offices(name) values (p_name) returning id into o;
  insert into members(office_id, user_id, role, display_name) values (o, auth.uid(), 'admin', p_display_name);
  insert into office_settings(office_id) values (o);
  return o;
end $$;

revoke all on function public.issue_ref_number(uuid,text,uuid,uuid,text) from public, anon;
revoke all on function public.create_office(text,text) from public, anon;
grant execute on function public.issue_ref_number(uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.create_office(text,text) to authenticated;
