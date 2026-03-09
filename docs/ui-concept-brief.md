# PhotoVault UI Concept Brief (PV-000)

## Objective
Select and implement a modern, easy-to-use UX/UI direction for adult school users, emphasizing trust, clarity, and task speed.

## Target Screens
- `/albums`
- `/albums/[id]`
- `/settings/branding` (Appearance)

## Concepts

### Concept A: Civic Clean (Recommended)
- Neutral light surfaces and restrained contrast
- Strong hierarchy with clear page headers
- Task-first actions (`New album`, `Upload`, `Share`)
- Minimal visual noise, high readability

### Concept B: Media Workspace
- Denser, operations-focused layout
- Persistent filters and bulk action affordances
- Faster for high-volume asset management

### Concept C: Branded Institution
- Same usability as Concept A with stronger school identity
- Brand lockups, accent rails, branded cards/headers
- Good for client-facing pride without reducing clarity

## UX Principles
- Clarity: users always know where they are and what to do next
- Speed: common actions require minimal clicks/scrolling
- Accessibility: readable typography, strong contrast, keyboard/focus support
- Trust: calm visual language appropriate for school administration

## Evaluation Plan
- Recruit 3-5 representative users (owners/admin staff/uploader roles)
- Use identical task script across concepts:
  - find an album
  - upload photos
  - set cover image
  - update appearance settings
- Score each concept 1-5 on:
  - Ease of use
  - Visual trust/professional feel
  - Speed to complete tasks
  - Perceived accessibility/readability

## Decision Rule
- Pick the highest average score.
- If tied, choose the one with better readability and fewer user errors.

## Current Direction
- Selected implementation baseline: **Concept B (Media Workspace)**.
- Current build now uses:
  - persistent top utility header
  - left sidebar / right content canvas layout
  - logo-first sidebar identity for collection pages
  - hero header blocks on key pages (`/albums`, `/albums/[id]`, `/super-admin`)
  - consistent card and chip language across major workflows

## Current Status (Implemented)
- `MediaWorkspaceShell` is the shared layout baseline for core pages.
- Albums page includes school hero, stats chips, toolbar search/sort/view controls, and grid/list support.
- Album detail page includes matching hero, improved photo card overlay actions, upload/search controls, and delete actions.
- Albums + Photos now use 4-column desktop media grids for consistency.
- Appearance page now uses the same structural shell and supports direct logo upload.
- Super Admin page now uses the same shell + hero/header treatment, dedicated admin sidebar, and card-based client portal overview.
- Login page action affordance is modernized (clear interactive button states).

## Next UX/UI Steps
- Add collection-level nav patterns for future sections (e.g. logos/colors/fonts/templates).
- Standardize iconography and action density (single icon set + button sizing system).
- Add empty/loading/error visual states that match the new shell.
- Run a short usability pass (3-5 users) and capture friction points by workflow:
  - find album
  - upload photos
  - choose cover
  - update appearance settings
