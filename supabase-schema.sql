-- Run this once in Supabase SQL Editor.

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

-- Website visitors can submit applications, but cannot read them.
drop policy if exists "Anyone can submit applications" on public.applications;
create policy "Anyone can submit applications"
on public.applications
for insert
to anon, authenticated
with check (true);

-- Only authenticated Supabase users can access the admin data.
drop policy if exists "Authenticated admins can read applications" on public.applications;
create policy "Authenticated admins can read applications"
on public.applications
for select
to authenticated
using (true);

drop policy if exists "Authenticated admins can update applications" on public.applications;
create policy "Authenticated admins can update applications"
on public.applications
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins can delete applications" on public.applications;
create policy "Authenticated admins can delete applications"
on public.applications
for delete
to authenticated
using (true);
