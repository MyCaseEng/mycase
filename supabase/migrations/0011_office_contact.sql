-- Office details printed in the letterhead of the standard forms.
alter table public.offices add column if not exists expert_reg text;  -- expert registration number (رقم القيد)
alter table public.offices add column if not exists phone text;
alter table public.offices add column if not exists email text;
