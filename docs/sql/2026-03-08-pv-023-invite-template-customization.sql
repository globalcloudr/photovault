begin;

create table if not exists public.org_invite_templates (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  subject text not null,
  body text not null,
  signature text not null,
  updated_by uuid,
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_org_invite_templates_updated_at
  on public.org_invite_templates (updated_at desc);

alter table public.org_invite_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'org_invite_templates'
      and policyname = 'org_invite_templates_select_owner_or_super_admin'
  ) then
    create policy org_invite_templates_select_owner_or_super_admin
      on public.org_invite_templates
      for select
      to authenticated
      using (is_super_admin() or is_org_owner(org_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'org_invite_templates'
      and policyname = 'org_invite_templates_write_super_admin'
  ) then
    create policy org_invite_templates_write_super_admin
      on public.org_invite_templates
      for all
      to authenticated
      using (is_super_admin())
      with check (is_super_admin());
  end if;
end $$;

commit;

