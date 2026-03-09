-- PhotoVault role model + RLS hardening
-- Target roles: owner, uploader, viewer
-- Run in Supabase SQL Editor after reviewing in a staging project.

begin;

-- 1) Lock memberships.role to approved values.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_role_check'
  ) then
    alter table public.memberships
      add constraint memberships_role_check
      check (role in ('owner', 'uploader', 'viewer'));
  end if;
end $$;

-- 2) Helper functions used by policies.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_super_admin = true
  );
$$;

create or replace function public.is_org_owner(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.is_org_uploader(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'uploader')
  );
$$;

create or replace function public.is_org_viewer(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'uploader', 'viewer')
  );
$$;

-- 3) memberships policies (owner-managed + super-admin override).
drop policy if exists memberships_select_member on public.memberships;
create policy memberships_select_member
on public.memberships
for select
to public
using (public.is_org_viewer(org_id) or public.is_super_admin());

drop policy if exists memberships_write_owner on public.memberships;
create policy memberships_write_owner
on public.memberships
for insert
to public
with check (public.is_org_owner(org_id) or public.is_super_admin());

drop policy if exists memberships_update_owner on public.memberships;
create policy memberships_update_owner
on public.memberships
for update
to public
using (public.is_org_owner(org_id) or public.is_super_admin())
with check (public.is_org_owner(org_id) or public.is_super_admin());

drop policy if exists memberships_delete_owner on public.memberships;
create policy memberships_delete_owner
on public.memberships
for delete
to public
using (public.is_org_owner(org_id) or public.is_super_admin());

-- 4) org_theme_settings policies (appearance managed by owner/super-admin).
-- Requires table: public.org_theme_settings(org_id uuid ...)
alter table public.org_theme_settings enable row level security;

drop policy if exists org_theme_select_member on public.org_theme_settings;
create policy org_theme_select_member
on public.org_theme_settings
for select
to public
using (public.is_org_viewer(org_id) or public.is_super_admin());

drop policy if exists org_theme_write_owner on public.org_theme_settings;
create policy org_theme_write_owner
on public.org_theme_settings
for all
to public
using (public.is_org_owner(org_id) or public.is_super_admin())
with check (public.is_org_owner(org_id) or public.is_super_admin());

-- 5) Optional alignment for core data tables.
-- Update policies to use role-aware helpers with same read/write model.
-- albums/assets/share_links should map to:
--   read:  is_org_viewer(...)
--   write: is_org_uploader(...) for asset inserts
--   admin: is_org_owner(...)
-- plus super admin override where applicable.

commit;

