begin;

alter table public.share_links
  add column if not exists token text;

alter table public.share_links
  add column if not exists expires_at timestamp with time zone;

alter table public.share_links
  add column if not exists password_hash text;

alter table public.share_links
  add column if not exists allow_download boolean not null default true;

alter table public.share_links
  add column if not exists revoked_at timestamp with time zone;

alter table public.share_links
  add column if not exists created_by uuid;

create unique index if not exists idx_share_links_token_unique
  on public.share_links (token);

create index if not exists idx_share_links_album_active
  on public.share_links (album_id, created_at desc);

create index if not exists idx_share_links_expires_at
  on public.share_links (expires_at);

commit;
