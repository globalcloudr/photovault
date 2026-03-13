-- PV-034: remove unused theme font columns
--
-- The application now uses built-in fonts only. These org-level columns were
-- stored but never applied, so they are safe to remove.

alter table public.org_theme_settings
  drop column if exists font_heading,
  drop column if exists font_body;
