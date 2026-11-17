-- Country of the office, shown with its flag in the letterhead. Existing offices default to Qatar.
alter table public.offices add column if not exists country text not null default 'QA'
  check (country ~ '^[A-Z]{2}$');
