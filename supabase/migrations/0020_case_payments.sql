-- Deposit and fees. In Qatar the parties pay the deposit to the court, not to the expert: the office records each
-- payment it learns of (receipt in the court papers, or a copy sent by the party), and later the fees the court pays out.
create table if not exists public.case_payments (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  office_id      uuid not null references public.offices(id) on delete cascade,
  kind           text not null check (kind in ('deposit', 'fee')),  -- deposit paid to the court / fees paid to the expert
  party_id       uuid references public.parties(id) on delete set null,
  payer_name     text,
  amount         numeric not null check (amount > 0),
  paid_on        date not null,
  receipt_no     text,
  file_path      text,   -- <office_id>/<case_id>/receipts/<file> in case-files
  note           text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists case_payments_case on public.case_payments(case_id);
create index if not exists case_payments_office on public.case_payments(office_id);

alter table public.case_payments enable row level security;
drop policy if exists case_payments_read on public.case_payments;
drop policy if exists case_payments_write on public.case_payments;
drop policy if exists case_payments_upd on public.case_payments;
drop policy if exists case_payments_del on public.case_payments;
create policy case_payments_read  on public.case_payments for select using (is_member(office_id));
create policy case_payments_write on public.case_payments for insert with check (can_write(office_id));
create policy case_payments_upd   on public.case_payments for update using (can_write(office_id)) with check (can_write(office_id));
create policy case_payments_del   on public.case_payments for delete using (can_write(office_id));

drop trigger if exists case_payments_office on public.case_payments;
create trigger case_payments_office before insert or update on public.case_payments
  for each row execute function public.check_case_office();

-- receipts may be photos as well as PDFs
update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
 where id = 'case-files';
