-- PV-006: Upload Queue + Duplicate Check
-- Adds file hash + processing status support for reliable uploads and duplicate prevention.
-- Run in Supabase SQL Editor.

begin;

alter table public.assets
  add column if not exists file_hash text;

alter table public.assets
  add column if not exists processing_status text not null default 'ready';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_processing_status_check'
  ) then
    alter table public.assets
      add constraint assets_processing_status_check
      check (processing_status in ('queued', 'uploading', 'processing', 'ready', 'failed'));
  end if;
end $$;

create index if not exists idx_assets_org_file_hash
  on public.assets (org_id, file_hash);

commit;

