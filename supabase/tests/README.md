# Database tests (local Postgres)

`auth_mock.sql` imitates Supabase's `auth` schema and roles so the migration can run on plain Postgres.
`isolation_test.sql` checks: office isolation, cross-office writes blocked, viewer read-only, anon sees nothing,
activity append-only, reference numbers never deleted/renumbered (only cancelled).

Result on 2026-11-16: all checks passed; 200 numbers issued from 10 parallel connections → 0 duplicates, 0 gaps.
