-- Type and field of the expertise, shown as an icon beside the basmala. Existing offices: engineering.
alter table public.offices add column if not exists specialty text not null default 'eng'
  check (specialty ~ '^[a-z]{2,20}$');
