begin;

create table if not exists public.marketing_pages (
  slug text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_marketing_pages_updated_at
  on public.marketing_pages (updated_at desc);

create table if not exists public.marketing_page_versions (
  id bigserial primary key,
  slug text not null references public.marketing_pages(slug) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_marketing_page_versions_slug_updated_at
  on public.marketing_page_versions (slug, updated_at desc);

insert into public.marketing_pages (slug, content)
values ('home', '{}'::jsonb)
on conflict (slug) do nothing;

alter table public.marketing_pages enable row level security;
alter table public.marketing_page_versions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_pages'
      and policyname = 'marketing_pages_select_public'
  ) then
    create policy marketing_pages_select_public
      on public.marketing_pages
      for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_pages'
      and policyname = 'marketing_pages_write_super_admin'
  ) then
    create policy marketing_pages_write_super_admin
      on public.marketing_pages
      for all
      to authenticated
      using (is_super_admin())
      with check (is_super_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_page_versions'
      and policyname = 'marketing_page_versions_select_super_admin'
  ) then
    create policy marketing_page_versions_select_super_admin
      on public.marketing_page_versions
      for select
      to authenticated
      using (is_super_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_page_versions'
      and policyname = 'marketing_page_versions_write_super_admin'
  ) then
    create policy marketing_page_versions_write_super_admin
      on public.marketing_page_versions
      for all
      to authenticated
      using (is_super_admin())
      with check (is_super_admin());
  end if;
end $$;

commit;
