begin;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_audit_events_org_created_at
  on public.audit_events (org_id, created_at desc);

create index if not exists idx_audit_events_org_event_type
  on public.audit_events (org_id, event_type);

alter table public.audit_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'audit_events_select_member'
  ) then
    create policy audit_events_select_member
      on public.audit_events
      for select
      to public
      using (is_org_member(org_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'audit_events_insert_member'
  ) then
    create policy audit_events_insert_member
      on public.audit_events
      for insert
      to authenticated
      with check (is_org_member(org_id) and actor_user_id = auth.uid());
  end if;
end $$;

commit;
