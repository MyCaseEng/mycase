-- A team account must replace its temporary password; the flag lives with the membership (read on every page).
alter table public.members add column if not exists must_change boolean not null default false;
update public.members set must_change = true
 where login is not null
   and user_id in (select id from auth.users where coalesce(raw_user_meta_data->>'must_change', 'false') = 'true');
