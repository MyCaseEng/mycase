-- Staff login IDs: the expert creates each team member's account (e.g. ahmed@qat123).
-- qat123 = passport country code + the expert's registration number, fixed once it is first used.
alter table public.offices add column if not exists login_code text unique
  check (login_code ~ '^[a-z]{3}[a-z0-9]{1,20}$');
alter table public.members add column if not exists login text;  -- shown in the team page, e.g. ahmed@qat123

create or replace function public.lock_login_code() returns trigger language plpgsql as $$
begin
  if old.login_code is not null and new.login_code is distinct from old.login_code then
    raise exception 'login code cannot change';
  end if;
  return new;
end $$;
drop trigger if exists offices_login_code_lock on public.offices;
create trigger offices_login_code_lock before update on public.offices
  for each row execute function public.lock_login_code();
