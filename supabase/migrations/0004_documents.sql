-- MyCase — step 6: Word templates stored per office, mission procedures, letters.

-- Templates: the .docx itself is kept (base64) in the row; one per kind and per assigning body.
alter table public.templates alter column file_path drop not null;
alter table public.templates add column if not exists content   text;   -- base64 of the .docx
alter table public.templates add column if not exists file_name text;
alter table public.templates drop constraint if exists templates_office_id_kind_assign_src_key;
create unique index if not exists templates_uniq on public.templates (office_id, kind, coalesce(assign_src, ''));

-- Only the office admin uploads or replaces templates; everyone in the office can use them.
drop policy if exists templates_write on public.templates;
drop policy if exists templates_upd   on public.templates;
drop policy if exists templates_del   on public.templates;
create policy templates_write on public.templates for insert with check (is_office_admin(office_id));
create policy templates_upd   on public.templates for update using (is_office_admin(office_id)) with check (is_office_admin(office_id));
create policy templates_del   on public.templates for delete using (is_office_admin(office_id));

-- Mission procedures: manual lines may carry an attached document; auto lines are overridden by auto_key.
alter table public.procedures add column if not exists att text;
create unique index if not exists procedures_auto_uniq on public.procedures (case_id, auto_key) where auto_key is not null;

-- Document numbering in the report: by party (default) or chronological.
alter table public.cases add column if not exists proc_num text not null default 'party'
  check (proc_num in ('party','time'));

-- Office address, printed in inspection minutes when the inspection is at the office.
alter table public.offices add column if not exists address text;

-- Question letters: address the party itself or its lawyer.
alter table public.question_letters add column if not exists send_to text not null default 'party'
  check (send_to in ('party','lawyer'));
