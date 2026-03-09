begin;

alter table public.assets
  add column if not exists updated_at timestamp with time zone not null default now();

create index if not exists idx_assets_org_updated_at
  on public.assets (org_id, updated_at desc);

create or replace function public.assets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_assets_set_updated_at'
  ) then
    create trigger trg_assets_set_updated_at
      before update on public.assets
      for each row
      execute function public.assets_set_updated_at();
  end if;
end $$;

commit;
