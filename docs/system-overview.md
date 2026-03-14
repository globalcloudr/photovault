# PhotoVault System Overview

## Stack

Frontend
Next.js (App Router)

Backend
Supabase

Database
PostgreSQL

Storage
Supabase Storage

Hosting
Vercel

Auth
Supabase Auth

## Key Tables

organizations
memberships
albums
assets
share_links
audit_events
org_theme_settings

## Storage Buckets

originals

Structure:

org_id/album_id/file.jpg

## Access Model

roles:

owner
uploader
viewer

super_admin override

## Major Routes

/albums
/albums/[id]
/collections/brand-guidelines
/settings/branding
/settings/users
/super-admin
/audit
/share/[token]

## Security

RLS policies enforce org isolation.
Storage path must begin with org_id.