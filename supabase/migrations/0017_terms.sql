-- Terms of use: each user accepts each version once; the platform owner sees who accepted.
create table if not exists public.terms_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.terms_acceptances enable row level security;
drop policy if exists terms_own on public.terms_acceptances;
create policy terms_own on public.terms_acceptances for select using (user_id = auth.uid());

create or replace function public.accept_terms(p_version text) returns void
language sql security definer set search_path = public as $$
  insert into terms_acceptances(user_id, version) values (auth.uid(), left(trim(p_version), 20))
  on conflict do nothing;
$$;
revoke all on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
