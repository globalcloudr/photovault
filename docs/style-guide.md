# PhotoVault Style Guide

## Purpose
Use this guide to keep all pages visually consistent and predictable.

## Current Layout Baseline
- Primary shell: [MediaWorkspaceShell](/Users/zylstra/Documents/photovault/src/components/layout/media-workspace-shell.tsx)
- Structure:
  - top utility header
  - left sidebar (navigation + org context + page filters)
  - right content canvas
- Collection pages default to logo-only sidebar identity.
- Core pages currently aligned to this shell:
  - `/albums`
  - `/albums/[id]`
  - `/settings/branding` (Appearance)
  - `/collections/brand-guidelines`
  - `/super-admin`

## Auth Surface
- Login screen uses a light card on neutral background with clear action hierarchy.
- All auth actions must use button-like affordance:
  - pointer cursor
  - hover state
  - keyboard-visible focus ring

## Design Tokens
Defined in [src/app/globals.css](/Users/zylstra/Documents/photovault/src/app/globals.css):

- `--background`, `--foreground`: page-level background and text.
- `--surface`, `--surface-muted`: cards and muted panels.
- `--border`: standard border color.
- `--text-muted`: secondary text.
- `--brand`, `--brand-contrast`: primary action colors.
- `--radius-sm`, `--radius-md`, `--radius-lg`: corner rounding scale.
- `--shadow-sm`: default card shadow.
- `--space-1` to `--space-6`: spacing scale.

## Typography
- Eyebrow labels: uppercase, small, tracked (`text-xs`, `tracking-[0.14em]`).
- Page title: `text-4xl` + `font-semibold` (Media Workspace header).
- Section title: `text-xl` + `font-semibold`.
- Body text: `text-sm`.
- Metadata text: `text-xs`.

## Component Primitives
Use shared primitives instead of hand-writing new utility strings:

- [Button](/Users/zylstra/Documents/photovault/src/components/ui/button.tsx)
  - Variants: `primary`, `secondary`, `ghost`, `danger`
  - Sizes: `sm`, `md`
  - For `Link` elements, use `buttonClass(...)`.
- [Card](/Users/zylstra/Documents/photovault/src/components/ui/card.tsx)
  - Base container for page sections and content blocks.
- [Badge](/Users/zylstra/Documents/photovault/src/components/ui/badge.tsx)
  - Tones: `neutral`, `dark`, `light`.
- [Input](/Users/zylstra/Documents/photovault/src/components/ui/input.tsx)
  - Base text/date/search input styles.
- [PageHeader](/Users/zylstra/Documents/photovault/src/components/layout/page-header.tsx)
  - Standard top-of-page title area with optional actions.
- [MediaWorkspaceShell](/Users/zylstra/Documents/photovault/src/components/layout/media-workspace-shell.tsx)
  - Standard app shell with sidebar + content layout.
- [OrgBrandLockup](/Users/zylstra/Documents/photovault/src/components/layout/org-brand-lockup.tsx)
  - Sidebar org identity with configurable logo-only mode.
- [Icons](/Users/zylstra/Documents/photovault/src/components/ui/icons.tsx)
  - Shared icon set for nav/actions (`Albums`, `Appearance`, `Guidelines`, `View`, `Download`, `Delete`, etc.).

## Icon Rules
- Default to `icon + text` for most controls.
- Use `icon-only` only for compact utility controls with tooltip/aria-label (settings, more actions, view toggles).
- Keep destructive actions explicit with danger styling (`Delete`).
- Use one icon size scale (`h-4 w-4` standard, `h-3.5 w-3.5` compact in dense rows).

## Layout Rules
- All collection/admin pages should use `MediaWorkspaceShell`.
- Use hero header cards at top of primary pages for context + stats chips.
- Keep sidebar interactions grouped: nav first, page tools second.
- Use `Card` sections instead of free-floating elements.
- Use consistent gaps (`gap-2`, `gap-4`, `space-y-5`) rather than ad-hoc spacing.
- Dense media grids should target 4 columns on desktop for Albums and Photos, with responsive collapse on smaller breakpoints.
- For photo cards, prefer image-overlay actions and compact metadata below image to reduce visual clutter.

## Interaction Rules
- All interactive controls must show hover + focus states.
- Disabled controls use reduced contrast and `not-allowed` cursor.
- Keep primary actions visually dominant, secondary actions neutral.

## Adoption Workflow
When building or editing a page:

1. Start with `MediaWorkspaceShell`.
2. Add page heading and main actions in shell `title/subtitle/actions`.
3. Add sidebar tools in `sidebarContent`.
4. Add hero context card when the page represents a collection/workspace.
5. Use `Card` for major sections and `Badge` for counts/status.
6. Use `Button`/`buttonClass` + `Input` for all controls.

If you need a new pattern, add it as a shared primitive first, then use it in pages.
