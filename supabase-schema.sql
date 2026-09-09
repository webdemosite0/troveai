-- Trove Supabase security setup
-- Run this in the Supabase SQL Editor.
--
-- IMPORTANT:
-- 1. Create your admin user first in Supabase Auth > Users.
-- 2. Copy that user's UUID.
-- 3. Run the INSERT shown at the bottom of this file.
--
-- Public visitors can INSERT applications.
-- Only users explicitly listed in private.admin_users can SELECT/UPDATE/DELETE them.

create schema if not exists private;

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Keep the admin registry out of the public Data API.
revoke all on table private.admin_users from anon, authenticated, public;
revoke all on schema private from anon, public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('join', 'invest')),
  name text not null,
  email text not null,
  company text,
  role text,
  link text,
  interest text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists applications_created_at_idx on public.applications (created_at desc);
create index if not exists applications_type_idx on public.applications (type);
create index if not exists applications_status_idx on public.applications (status);

alter table public.applications enable row level security;

-- Remove the previous broad authenticated-user policies.
drop policy if exists "Anyone can submit applications" on public.applications;
drop policy if exists "Authenticated admins can read applications" on public.applications;
drop policy if exists "Authenticated admins can update applications" on public.applications;
drop policy if exists "Authenticated admins can delete applications" on public.applications;

-- Least-privilege grants: visitors can submit; only authenticated users can attempt admin operations.
revoke all on table public.applications from anon, authenticated;
grant insert on table public.applications to anon, authenticated;
grant select, update, delete on table public.applications to authenticated;

create policy "Anyone can submit applications"
on public.applications
for insert
to anon, authenticated
with check (true);

create policy "Trove admins can read applications"
on public.applications
for select
to authenticated
using ((select private.is_admin()));

create policy "Trove admins can update applications"
on public.applications
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Trove admins can delete applications"
on public.applications
for delete
to authenticated
using ((select private.is_admin()));

-- ============================================================
-- AFTER creating your admin user in Supabase Auth, run:
-- ============================================================
-- insert into private.admin_users (user_id)
-- values ('PASTE-YOUR-ADMIN-USER-UUID-HERE');
--
-- Verify it with:
-- select * from private.admin_users;
-- ============================================================
