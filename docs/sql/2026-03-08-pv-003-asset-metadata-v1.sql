-- PV-003: Asset Metadata v1
-- Adds school-relevant metadata fields to assets.
-- Run in Supabase SQL Editor.

begin;

alter table public.assets
  add column if not exists tags text[] not null default '{}';

alter table public.assets
  add column if not exists event_type text;

alter table public.assets
  add column if not exists campus text;

alter table public.assets
  add column if not exists photographer text;

create index if not exists idx_assets_tags_gin
  on public.assets using gin(tags);

create index if not exists idx_assets_event_type
  on public.assets (event_type);

create index if not exists idx_assets_campus
  on public.assets (campus);

create index if not exists idx_assets_photographer
  on public.assets (photographer);

commit;

