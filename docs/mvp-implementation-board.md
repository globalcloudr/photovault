# PhotoVault MVP Implementation Board

Repository: `/Users/zylstra/Documents/photovault`  
Stack: Next.js App Router + Supabase Auth/DB/Storage

## Phase 1: Now (MVP Core)

### PV-000: Product UX/UI Modernization Direction
- Goal: Finalize a modern, easy-to-use visual/interaction direction for adult school users before deeper UI expansion.
- Scope:
  - define 2-3 design concepts (same core screens)
  - evaluate readability, trust, and task speed for school admins/staff
  - pick one direction and codify as implementation baseline
- Core screens for concept comparison:
  - `/albums`
  - `/albums/[id]`
  - `/settings/branding` (Appearance)
  - `/super-admin`
- Files to update after selection:
  - `/Users/zylstra/Documents/photovault/src/app/globals.css`
  - `/Users/zylstra/Documents/photovault/src/components/ui/*`
  - `/Users/zylstra/Documents/photovault/src/components/layout/*`
  - `/Users/zylstra/Documents/photovault/docs/style-guide.md`
- Acceptance:
  - one approved visual system documented
  - shared component styles aligned to chosen direction
  - no major page-level style drift across primary workflows
- Artifact:
  - `/Users/zylstra/Documents/photovault/docs/ui-concept-brief.md`
- Status:
  - `Completed (v1 shell rollout)`
  - concept selected: `Concept B: Media Workspace`
  - layout implemented on: `/albums`, `/albums/[id]`, `/settings/branding` (Appearance), `/super-admin`

### PV-001: Standardize Membership Roles
- Goal: Use clear org roles: `owner`, `uploader`, `viewer`.
- DB tables/functions:
  - `memberships.role`
  - helper SQL functions `is_org_owner(org_id)`, `is_org_uploader(org_id)`
- Files to update:
  - `/Users/zylstra/Documents/photovault/src/components/org/org-provider.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/api/super-admin/invite-admin/route.ts`
  - `/Users/zylstra/Documents/photovault/src/app/super-admin/page.tsx`
- Acceptance:
  - owner invite creates `owner` role row
  - org owner can invite `uploader`/`viewer`
  - non-owner cannot assign owner role
- Status:
  - `Completed in production`

### PV-002: RLS Permission Hardening
- Goal: Enforce role-based access for albums/assets/share links.
- DB:
  - update RLS policies on `albums`, `assets`, `share_links`, `org_theme_settings`
  - include `is_super_admin()` override
- Files:
  - SQL migration file (new)
- Acceptance:
  - viewer: read only
  - uploader: read + upload
  - owner: full org management
  - super admin: cross-org control
- Status:
  - `Completed in production`

### PV-003: Asset Metadata v1
- Goal: Add school-relevant metadata fields.
- DB:
  - `assets` add: `tags text[]`, `event_type text`, `campus text`, `photographer text`
  - indexes on searchable fields
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
- Acceptance:
  - metadata displayed and editable per asset
  - data persists to Supabase
- Status:
  - `Completed in production`
  - SQL applied: `2026-03-08-pv-003-asset-metadata-v1.sql`
  - SQL applied: `2026-03-08-pv-025-assets-updated-at.sql` (`assets.updated_at` + auto-update trigger)
  - UI implemented on `/albums/[id]` with per-asset inline save

### PV-004: Bulk Metadata Edit
- Goal: Edit metadata for many assets at once.
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
  - optional helper in `/Users/zylstra/Documents/photovault/src/lib/`
- Acceptance:
  - multi-select assets
  - apply tags/rights fields to selected set
- Status:
  - `Completed in app`
  - implemented: multi-select + bulk apply (`tags`, `event_type`, `campus`, `photographer`)
  - implemented: bulk clear toggles per field

### PV-005: Search + Filters v1
- Goal: Fast findability on asset grid.
- DB:
  - indexes on `assets.created_at`, `assets.taken_at`, `assets.tags`, `assets.album_id`
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/albums/page.tsx`
- Acceptance:
  - keyword + filter UI (date/rights/tags)
  - query reflects selected filters
- Status:
  - `Completed in app`
  - implemented keyword search on `/albums/[id]` (filename/sequence + metadata fields)
  - album list search/filter controls available on `/albums`
  - albums search moved into top toolbar card (replacing the “albums shown” row text)

### PV-006: Upload Queue + Duplicate Check
- Goal: More reliable upload UX.
- DB:
  - `assets` add `file_hash text`, `processing_status text default 'ready'`
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
- Acceptance:
  - per-file upload results shown
  - duplicate warning for same hash within org
- Status:
  - `Completed in production`
  - SQL applied: `2026-03-08-pv-006-upload-queue-duplicate-check.sql`
  - UI implemented on `/albums/[id]` with queue states + hash duplicate skip

## Phase 2: Next (MVP+ Operations)

### PV-007: Share Link Security Controls
- Goal: Safe external sharing.
- DB:
  - `share_links` add `expires_at`, `password_hash`, `allow_download boolean`
- Files:
  - new public share route(s) under `/Users/zylstra/Documents/photovault/src/app/`
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
- Acceptance:
  - optional password protection
  - expiry enforced
  - optional download disable
- Status:
  - `Completed in app`
  - SQL migration added: `2026-03-08-pv-007-share-link-security-controls.sql`
  - implemented album share management UI (`create`, `copy`, `revoke`) on `/albums/[id]`
  - implemented public share route `/share/[token]` with password + expiry checks
  - added compatibility handling for legacy `token_hash`-required schemas
  - revoked/expired link retention policy communicated in UI/docs: audit retention up to 1 year

### PV-008: Audit Log
- Goal: Trace who did what.
- DB:
  - new `audit_events` table
- Files:
  - API routes under `/Users/zylstra/Documents/photovault/src/app/api/`
  - new admin view page
- Acceptance:
  - events captured for invites, uploads, deletes, share actions
  - events captured for appearance and Brand Portal changes
  - org owner can review logs
- Status:
  - `Completed in app`
  - SQL migration added: `2026-03-08-pv-008-audit-log.sql`
  - added shared server/client audit logging utilities
  - added authenticated audit event API route: `/api/audit-events`
  - wired events for:
    - super admin school creation + admin invites
    - share link create/access/revoke
    - photo upload batches + delete actions
    - appearance save + logo upload
    - Brand Portal uploads/deletes/notes/hero updates
  - added org-owner/super-admin audit review page: `/audit`
  - added super-admin quick actions to open active/per-org audit views

### PV-009: Appearance UX Improvements
- Goal: Remove manual logo URL dependency and improve org appearance management.
- DB/Storage:
  - store uploaded logos in Supabase Storage
  - save storage path in `org_theme_settings.logo_url`
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/settings/branding/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/collections/brand-guidelines/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/lib/theme.ts`
- Acceptance:
  - logo upload button in appearance page
  - Brand Portal collection supports org-level logo/doc references
  - lockup updates immediately
- Status:
  - `Completed in app`
  - implemented direct logo upload in `Appearance`
  - `logo_url` now supports storage-backed references
  - sidebar lockup resolves storage refs and renders signed URLs

### PV-016: UI Stabilization + Usability Validation (Post-Modernization)
- Goal: Lock the new Media Workspace design into repeatable page patterns and validate with real school users.
- Scope:
  - finalize shell usage rules for all collection pages
  - normalize action hierarchy and icon treatment
  - validate with 3-5 users and capture task friction
- Files:
  - `/Users/zylstra/Documents/photovault/src/components/layout/media-workspace-shell.tsx`
  - `/Users/zylstra/Documents/photovault/docs/style-guide.md`
  - `/Users/zylstra/Documents/photovault/docs/user-guide.md`
- Acceptance:
  - shared shell pattern documented and followed by all collection pages
  - usability feedback captured with prioritized fixes list
  - no layout drift between Albums, Photos, Appearance, Brand Portal, Super Admin

### PV-020: Multi-View Modes (Collection/Grid/Table/Compact)
- Goal: Support alternate viewing modes for albums/assets while preserving current default collection view.
- Scope:
  - add explicit view selector UI
  - implement at least:
    - `Collection/Grid` (current default)
    - `Table/List` (metadata-first)
    - `Compact` (high-density cards)
  - persist user preference per page/user (local storage first; DB preference later)
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
  - optional shared view-switcher component under `/Users/zylstra/Documents/photovault/src/components/`
- Acceptance:
  - view label corresponds to actual available view modes
  - switching views does not break existing actions (open, upload, metadata, download)
  - preference persists on refresh
- Status:
  - `Completed in app (MVP scope)`
  - implemented on `/albums`: working `Grid` and `List` toggle + sort controls in top toolbar
  - implemented on `/albums/[id]`: working `Grid` and `List` toggle + search + sort controls
  - implemented: view mode and sort preference persistence via local storage on both pages
  - note: `Compact` view remains a future enhancement (optional, not required for MVP acceptance)

### PV-022: Content Reordering + Move Operations
- Goal: Let users organize content manually by reordering and moving items.
- Scope:
  - reorder albums in `/albums` (drag/drop or move controls)
  - reorder photos in `/albums/[id]`
  - move selected photos between albums
  - optional: move albums between departments/collections
- Data model:
  - add `sort_order` to `albums` and `assets`
  - maintain org-safe updates under RLS
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/albums/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/albums/[id]/page.tsx`
  - SQL migration for `sort_order` columns + indexes
- Acceptance:
  - order persists after refresh
  - move actions preserve metadata and access controls
  - bulk move supports selected photo sets

### PV-023: Personalized Invite Acceptance + Workspace Setup UX
- Goal: Replace generic post-invite loading with branded, trust-building onboarding feedback.
- Entry point in app flow:
  - initiated from Super Admin `Create School` + `Invite School Admin` workflow
- Scope:
  - customizable invite message templates (subject/body/signature) for school onboarding emails
  - placeholder support for dynamic fields (school name, invite link, sender name)
  - dedicated invite acceptance/setup state page
  - show school name and logo during setup
  - clear setup progress steps (verify invite, provision workspace, load vault)
  - visible loading animation/progress indicator
  - “still working” fallback messaging after 10–15 seconds
  - retry/failure path with actionable guidance
  - optional copy for monthly package activation context
- Files:
  - invite/auth callback route/page(s) under `/Users/zylstra/Documents/photovault/src/app/`
  - org branding fetch helpers (`logo/name`)
  - super-admin invite template editor + API:
    - `/Users/zylstra/Documents/photovault/src/app/api/super-admin/invite-template/route.ts`
    - `/Users/zylstra/Documents/photovault/src/lib/invite-template.ts`
    - `/Users/zylstra/Documents/photovault/src/app/super-admin/page.tsx`
  - style alignment in `/Users/zylstra/Documents/photovault/src/app/globals.css` and layout primitives
- Acceptance:
  - users receive immediate visual feedback after invite click
  - onboarding state remains clear during 15–20 second setup windows
  - final redirect to vault is explicit and branded
  - no generic “connected successfully” dead-end state
- Status:
  - `Completed in app`
  - replaced generic root connection screen with branded setup/onboarding surface
  - implemented setup steps with progress feedback:
    - verify invite/session
    - load school profile/logo
    - prepare workspace and explicit redirect
  - added 10+ second fallback messaging for longer setup windows
  - added unauthenticated and error/retry states
  - added super-admin editable invite templates (subject/body/signature + placeholders)
  - added invite template preview and per-org template persistence
  - invitation metadata now carries personalized message content
  - invite acceptance/setup screen now renders personalized message content
  - SQL migration added: `2026-03-08-pv-023-invite-template-customization.sql`
  - note: fully custom email-body rendering still depends on Supabase Auth email template configuration
  - file updated: `/Users/zylstra/Documents/photovault/src/app/page.tsx`

### PV-024: Marketing Homepage for Adult Schools
- Goal: Create a public-facing homepage that clearly explains PhotoVault for adult school buyers/users.
- Positioning / USP draft:
  - "The only enterprise-grade DAM specifically built for adult education schools."
  - Note: refine wording during final homepage copy pass.
- Scope:
  - build a dedicated homepage at `/`
  - include core DAM homepage sections:
    - hero (value proposition for adult schools)
    - key features/capabilities
    - workflow overview (upload, organize, share)
    - trust/security highlights
    - pricing or package-ready CTA area
    - testimonials/proof placeholder
    - footer with contact/support links
  - include clear CTA paths:
    - sign in
    - request demo / contact
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/components/marketing/marketing-homepage.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/super-admin/homepage/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/api/marketing-homepage/route.ts`
  - `/Users/zylstra/Documents/photovault/src/app/api/super-admin/marketing-homepage/*`
  - `/Users/zylstra/Documents/photovault/src/lib/marketing-homepage-content.ts`
  - `/Users/zylstra/Documents/photovault/docs/sql/2026-03-08-pv-024-marketing-homepage-cms.sql`
- Acceptance:
  - homepage is aligned to current style direction and mobile responsive
  - messaging is explicitly targeted to adult schools
  - primary CTA paths are clear and working
- Status:
  - `Completed in app (v2 CMS + versioning)`
  - implemented new public-facing homepage on `/` with:
    - large hero + open spacing
    - metrics band between Why and Features
    - Why/Features/Testimonials/CTA sections
    - `How it works` 3-step row near CTA
    - adult-school focused DAM messaging and USP callout
  - preserved invite/session setup behavior for authenticated invite acceptance flows
  - migrated from iframe/static handoff to native Next.js marketing component
  - added Super Admin `Homepage CMS` editor for copy + image control
  - added image upload endpoint for feature media
  - added `marketing_pages` + `marketing_page_versions` with restore workflow
  - homepage CMS now includes editable fields for:
    - metrics band values/details
    - how-it-works step titles/bodies
  - SQL migration added: `2026-03-08-pv-024-marketing-homepage-cms.sql`

### PV-010: Org Admin Staff Management
- Goal: Let school owners manage their own team.
- Files:
  - new `/settings/users` page
  - new API route for org-scoped invites
- Acceptance:
  - owner invites staff as uploader/viewer
  - owner can deactivate membership
- Status:
  - `Completed in app`
  - added org admin staff API route: `/api/org-admin/staff` (`GET`, `POST`, `DELETE`)
  - added owner/super-admin gated page: `/settings/users`
  - implemented:
    - list org memberships with invite acceptance status
    - invite `uploader`/`viewer`
    - deactivate non-owner memberships
  - audit events added for `staff_invited` and `staff_membership_deactivated`

### PV-011: Storage Usage Dashboard
- Goal: Basic operational visibility.
- DB:
  - usage aggregation table or scheduled computation
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/super-admin/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/app/albums/page.tsx`
- Acceptance:
  - show file count and bytes per org
- Pricing/Billing Note:
  - for school-level pricing, meter usage per `org_id` inside PhotoVault (storage bytes, uploads, downloads/shares, active users as needed)
  - Supabase and Vercel usage/cost data should be treated as provider-level baseline costs
  - if multiple schools share one Supabase project, provider invoices are mixed and cannot be used directly as per-school line items
- Status:
  - `Completed in app`
  - `/super-admin` shows per-org storage bytes and platform total storage
  - `/albums` shows active-org storage usage in the header stats

### PV-017: Strict Org-Scoped Asset Paths + Policies
- Goal: Ensure all school-config assets are isolated by organization and enforced by policy.
- Scope:
  - confirm/standardize org-scoped storage prefixes for:
    - appearance assets
    - Brand Portal assets (hero/logos/icons/documents)
  - add/update storage/object policies to block cross-org access
- Files:
  - storage policy SQL migration (new)
  - `/Users/zylstra/Documents/photovault/src/app/collections/brand-guidelines/page.tsx`
  - `/Users/zylstra/Documents/photovault/src/lib/theme.ts`
- Acceptance:
  - each org can only read/write assets under its own path
  - super admin access behaves as designed
  - cross-org access tests fail as expected
- Status:
  - `Completed in production`
  - SQL migration added: `2026-03-08-pv-017-strict-org-scoped-paths-policies.sql`
  - migration executed successfully in production
  - adds:
    - `public.path_org_id(path text)` helper for org prefix extraction
    - `assets` constraint enforcing `storage_path` begins with `org_id/`
    - hardened `storage.objects` policies for `originals` bucket:
      - read: org member or super admin
      - insert: org uploader/owner or super admin
      - update/delete: org owner or super admin
  - note: storage policy updates are best-effort in environments without `storage.objects` ownership privileges

### PV-019: Iconography Section Completion (MVP)
- Goal: Finalize Iconography as a practical, standards-driven section for school teams.
- Required structure:
  - short rule block at top covering:
    - icon style guidance
    - stroke/weight guidance
    - allowed color + background contrast guidance
  - one primary `Download Icons` action:
    - points to a zipped icon pack (`SVG + PNG`)
    - includes approved icons only
  - visual preview grid:
    - 12–24 sample icons in one consistent style
    - single branded preview panel
  - simple do/don't notes:
    - Do: consistent stroke, spacing, size
    - Don't: mixed styles, random colors, stretched icons
  - metadata tags per icon file:
    - `ui`, `social`, `navigation`, `filled`, `outline`, `approved`
- Implementation notes for current app:
  - upload icon files to `brand-guidelines/icons`
  - auto-preview grid from uploaded files
  - `Download Icons` button now, with selected/all zip export added next
- Files:
  - `/Users/zylstra/Documents/photovault/src/app/collections/brand-guidelines/page.tsx`
  - optional API route/function for zip generation
- Acceptance:
  - icon guidance block present and editable by owner/super admin
  - icon preview grid consistently rendered from org-scoped files
  - downloadable approved icon set available from section action
  - tags available and searchable in icon library
- Status:
  - `Completed in app (MVP)`
  - implemented on `/collections/brand-guidelines`:
    - editable icon rules block (style, stroke/weight, contrast)
    - icon-specific do/don't guidance notes
    - org-scoped icon upload + preview grid
    - per-icon metadata tags persisted in portal config
    - `Download icons` action for approved icon library files
  - follow-up enhancement: optional single zip export endpoint for one-click packaged download

## Phase 3: Later (Scale + Governance)

### PV-012: Derivative Pipeline (thumb/web/original)
- Goal: Faster viewing and controlled delivery.
- Platform:
  - Supabase Storage + background worker/edge function
- Acceptance:
  - original + web + thumbnail variants maintained

### PV-013: Retention + Archive Policies
- Goal: lifecycle controls by school year/program.
- DB:
  - archive flags/retention fields
- Acceptance:
  - archive and restore flow for owners

### PV-014: Saved Searches + Smart Albums
- Goal: power-user discovery.
- DB:
  - saved query table per org/user
- Acceptance:
  - reusable filter presets

### PV-015: Compliance/Export
- Goal: compliance-friendly reporting.
- Acceptance:
  - export audit logs and metadata manifests

### PV-018: Billing + Plan Boundaries (Pre-Onboarding Gate)
- Goal: Define and enforce plan limits per organization before launch-scale onboarding.
- Scope:
  - introduce org plan model (tier, limits, status)
  - enforce caps (storage, users, share links, upload volume as needed)
  - expose plan state in super admin tooling
- Files:
  - new DB migration(s) for org plan data
  - `/Users/zylstra/Documents/photovault/src/app/super-admin/page.tsx`
  - relevant API routes enforcing limits
- Acceptance:
  - every org has plan metadata
  - limit checks enforced server-side
  - over-limit behavior is clear in UI/API responses

### PV-025: Vercel Production Deployment (Go-Live)
- Goal: Push approved build to production Vercel environment after beta sign-off and readiness review.
- Scope:
  - connect repository to Vercel project
  - configure environment variables for production:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
  - verify auth callback/reset URLs point to production domain
  - run production smoke test on core routes (`/`, `/login`, `/albums`, `/super-admin`)
- Files/Systems:
  - Vercel project settings
  - Supabase auth URL settings
  - optional docs update in `/Users/zylstra/Documents/photovault/README.md`
- Acceptance:
  - production deployment is live and accessible via Vercel domain/custom domain
  - login/invite/reset flows work against production URL
  - no hardcoded localhost URLs remain in production paths

### PV-026: Mobile Sidebar Drawer Navigation
- Goal: Make sidebar navigation usable on phones/tablets with an explicit mobile drawer pattern.
- Scope:
  - add mobile header menu trigger (hamburger)
  - convert left sidebar to slide-out drawer on small screens
  - support open/close states, overlay backdrop, and keyboard/escape close
  - keep desktop sidebar behavior unchanged
  - align right-side asset editor drawer behavior on mobile (full-width panel/sheet; no clipped actions)
- Files:
  - `/Users/zylstra/Documents/photovault/src/components/layout/media-workspace-shell.tsx`
  - related shared layout components as needed
- Acceptance:
  - sidebar is hidden by default on mobile and opens via menu trigger
  - navigation remains accessible and touch-friendly
  - no layout regressions on desktop widths
  - asset editor remains fully usable on mobile widths (open/edit/save/close)

### PV-027: UI Consistency QA Checklist + Audit Pass
- Goal: Formalize and enforce design/layout consistency as features continue shipping.
- Scope:
  - create a page-level UI QA checklist (header, toolbar, sidebar, card patterns, states, spacing, accessibility)
  - run an audit pass on core routes:
    - `/albums`
    - `/albums/[id]`
    - `/settings/branding`
    - `/collections/brand-guidelines`
    - `/super-admin`
  - capture and prioritize drift/fixes
- Files:
  - `/Users/zylstra/Documents/photovault/docs/style-guide.md`
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
  - optional supporting checklist doc in `/Users/zylstra/Documents/photovault/docs/`
- Acceptance:
  - reusable checklist documented and adopted in workflow
  - audit findings listed with priority
  - top-priority consistency fixes implemented

### PV-028: End-User Guide (PhotoVault Navigation + Tasks)
- Goal: Provide a clear user guide so school staff can navigate and use PhotoVault without admin support.
- Scope:
  - document primary navigation and page purpose:
    - Albums
    - Photos
    - Appearance
    - Brand Portal
    - Share Album
  - document core workflows:
    - create album
    - upload photos (button + drag/drop)
    - search/sort/grid-list views
    - edit asset details + tags
    - create/revoke share links
  - include role-based notes for `owner`, `uploader`, `viewer`
  - include a quick troubleshooting section (common errors + what to do)
- Files:
  - `/Users/zylstra/Documents/photovault/docs/user-guide.md`
  - optional links from `/Users/zylstra/Documents/photovault/README.md`
- Acceptance:
  - guide reflects current UI/routes
  - non-technical school users can complete common tasks using only guide steps
  - role permissions and limits are clearly documented

### PV-029: Private Beta Deployment + School Testing Cycle
- Goal: Run real-school validation on a live but controlled environment before full launch.
- Scope:
  - deploy PhotoVault to a private Vercel beta URL
  - configure Supabase auth redirect/callback URLs for beta domain
  - invite 2-5 pilot schools to test core workflows
  - collect structured feedback using beta checklist
  - triage issues and define go/no-go criteria for production launch
- Files/Systems:
  - Vercel project settings
  - Supabase Auth URL settings
  - `/Users/zylstra/Documents/photovault/docs/beta-school-feedback-checklist.md`
  - `/Users/zylstra/Documents/photovault/docs/private-beta-deployment-checklist.md`
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
- Acceptance:
  - beta URL is stable and accessible to invited schools
  - invite/login/reset flows work against beta URL
  - feedback collected from at least 2 pilot schools
  - top beta issues are prioritized before production cutover

### PV-030: Production Readiness Code Review Gate (Pre-Go-Live)
- Goal: Verify codebase is production-ready before final Vercel production deployment.
- Scope:
  - run full engineering readiness review:
    - lint/type/test checks
    - route smoke tests for core flows
    - security review pass (RLS/policies/env exposure/service-role usage)
    - performance sanity checks (largest pages/routes)
    - error-state review (loading/retry/failure paths)
  - verify docs/ops readiness:
    - migration history complete
    - rollback notes present for latest critical changes
    - environment variable inventory is current
- Files:
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
  - `/Users/zylstra/Documents/photovault/README.md`
  - optional release checklist doc under `/Users/zylstra/Documents/photovault/docs/`
- Acceptance:
  - production-readiness checklist is complete and signed off
  - open critical/high issues = 0
  - explicit go/no-go decision recorded before PV-025

### PV-034: Cloudflare Production Hardening
- Goal: Add edge/network protection appropriate for school clients before production launch.
- Scope:
  - connect production domain through Cloudflare
  - enable SSL/TLS and verify secure origin configuration
  - configure WAF protections for common web attack classes
  - add rate limiting and bot mitigation for sensitive routes where appropriate
  - verify caching rules do not interfere with authenticated app flows
  - document production DNS and traffic-routing setup
- Files/Systems:
  - Cloudflare zone settings
  - production domain DNS records
  - Vercel domain settings
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
- Acceptance:
  - production domain is proxied through Cloudflare with valid TLS
  - WAF/rate-limiting rules are active and tested
  - authenticated app routes continue to work correctly behind Cloudflare
  - DNS and security configuration are documented for operations

## Phase 4: Product Roadmap (AI)

### AI-01: Metadata Q&A Assistant
- Goal: Let users query PhotoVault albums/assets with natural language while staying within org and role boundaries.
- Scope:
  - natural-language Q&A over structured metadata:
    - albums, photos, tags, event type, campus, photographer, rights status, dates
  - return actionable answers + linked result sets (open album/photos view)
  - support common prompts:
    - "show all graduation photos from San Mateo campus"
    - "find marketing-ready photos from last quarter"
    - "which albums have no tags yet?"
- Acceptance:
  - responses are org-scoped and role-safe (no cross-org leakage)
  - assistant output maps to existing filters/views in app
  - incorrect/ambiguous prompts return safe fallback guidance

### AI-02: Internal Knowledge Assistant
- Goal: Provide in-app help for school teams using internal docs and guidance content.
- Scope:
  - retrieval over approved internal knowledge:
    - `docs/user-guide.md` (primary launch source)
    - SOPs, Brand Portal guidance, onboarding docs
  - answer "how do I…" questions contextually inside PhotoVault
  - role-aware guidance for `owner`, `uploader`, `viewer`
  - deep-link answers to the exact route/action when possible (for example `/albums`, `/albums/[id]`, `/settings/profile`, `/collections/brand-guidelines`)
  - include audit-aware help patterns for governance actions
- Acceptance:
  - answers are grounded in approved sources with clear references
  - org/role boundaries are enforced for any scoped knowledge content
  - assistant can route users to the correct app page/workflow via direct links

### PV-031: Integrations Hub (Google Drive + External Connectors)
- Goal: Provide a centralized Integrations page where organizations can connect approved external storage/services.
- Scope:
  - add `Integrations` page in settings/super-admin context
  - support connection management lifecycle:
    - connect
    - view status
    - disconnect/revoke
  - initial connector targets:
    - Google Drive
    - placeholder architecture for additional providers (Dropbox, OneDrive, Box, etc.)
  - define sync/import behavior per connector (manual import first, scheduled sync later)
  - include audit events for connect/disconnect/import actions
- Files:
  - new integrations UI route under `/Users/zylstra/Documents/photovault/src/app/`
  - connector API routes under `/Users/zylstra/Documents/photovault/src/app/api/`
  - credentials/token storage model (encrypted/secure handling)
- Acceptance:
  - org owner (and super admin as designed) can connect/disconnect providers
  - provider access is org-scoped and role-safe
  - connection failures show actionable error states
  - imported files/assets preserve org boundaries and audit visibility

### PV-032: Customer-Facing Product Roadmap Page (High-Level)
- Goal: Provide users with a clear, non-technical view of product direction to build trust and transparency.
- Scope:
  - add a lightweight in-app page (or public page) with three sections:
    - `Now shipping`
    - `Up next`
    - `Exploring`
  - keep content benefit-focused and non-technical
  - avoid internal implementation details, security internals, or hard launch dates
  - include a feedback link to capture user interest/priorities
- Files:
  - new route/page under `/Users/zylstra/Documents/photovault/src/app/`
  - optional content source in docs/CMS for easy updates
- Acceptance:
  - roadmap language is customer-safe and easy to scan
  - content can be updated without engineering-heavy changes
  - page improves roadmap visibility without overcommitting timelines

### PV-033: TinaCMS Integration (SuperAdmin-Only Marketing + Help Content)
- Goal: Enable Git-based content workflows for marketing/help pages, editable by Super Admin only.
- Scope:
  - integrate TinaCMS for content collections such as:
    - homepage marketing copy
    - help/user-facing docs
    - customer-facing roadmap/changelog copy
  - restrict Tina editor access to Super Admin users only
  - keep operational app data in Supabase (no DAM runtime data in Tina)
  - publish via Git commits + standard Vercel deployment flow
- Files/Systems:
  - Tina config and schema files in repository
  - marketing/help page renderers that read Tina-managed content
  - auth/guard wiring for super-admin-only editor access
- Acceptance:
  - Super Admin can edit approved content collections without direct code edits
  - non-super-admin users cannot access Tina editor
  - content changes are versioned in Git and deploy through normal pipeline
  - albums/photos/users/share/runtime DAM data remains Supabase-managed

### PV-035: Paper.design Evaluation for Marketing Workflow
- Goal: Evaluate whether Paper.design improves homepage/marketing design iteration without disrupting the current implementation workflow.
- Scope:
  - test Paper.design on one marketing page flow such as homepage or roadmap page
  - verify fit with the current VS Code/Codex workflow
  - compare iteration speed and output quality against the direct build approach
  - document whether Paper.design should be adopted, limited to experiments, or rejected
- Files/Systems:
  - Paper.design evaluation notes
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
- Acceptance:
  - one real evaluation pass completed
  - decision recorded: adopt, defer, or reject
  - no dependency added to the runtime app architecture without explicit approval

### PV-037: Internal Component Library + Design System Pass
- Goal: Turn recurring PhotoVault UI patterns into a reusable component system that improves consistency and speeds up future products.
- Scope:
  - identify and standardize core UI primitives:
    - buttons
    - inputs
    - selects
    - badges/chips
    - cards
    - modals
    - drawers
    - menus
  - extract recurring app patterns into reusable components:
    - search/sort/view toolbar
    - empty states
    - album cards
    - photo cards
    - profile menu
    - settings panels
  - document visual and behavioral rules for reuse
  - evaluate component-system tooling for future adoption, including:
    - `shadcn/ui`
    - `Radix UI`
    - `HeroUI`
- Files:
  - shared UI components under `/Users/zylstra/Documents/photovault/src/components/`
  - style/design-system notes under `/Users/zylstra/Documents/photovault/docs/`
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
- Acceptance:
  - repeated UI patterns are consolidated into reusable components
  - design behavior is more consistent across app surfaces
  - future product builds can reuse documented component decisions
  - tooling recommendation recorded: adopt, partially adopt, or keep custom approach

### PV-036: Post-Launch Lessons Learned + Build Workflow Retrospective
- Goal: Capture what worked, what slowed delivery, and what should change before building the next product.
- Scope:
  - document lessons learned across:
    - planning and sequencing
    - design iteration workflow
    - SQL migration workflow
    - frontend build patterns
    - deployment/release process
    - beta feedback and issue triage
    - documentation quality and maintenance
  - identify repeatable patterns worth standardizing for future products
  - identify avoidable mistakes and process gaps
  - produce a concise recommendations list for the next build
- Files:
  - new retrospective doc under `/Users/zylstra/Documents/photovault/docs/`
  - `/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md`
- Acceptance:
  - lessons learned document exists and is actionable
  - improvements are grouped into “keep”, “change”, and “avoid next time”
  - next-product workflow recommendations are clear enough to reuse directly

## Sequential Delivery Order (Lockstep)
Follow this order sequentially. Do not skip ahead.

1. PV-006 Upload Queue + Duplicate Check
2. PV-003 Asset Metadata v1
3. PV-004 Bulk Metadata Edit
4. PV-005 Search + Filters v1
5. PV-007 Share Link Security Controls
6. PV-008 Audit Log
7. PV-017 Strict Org-Scoped Asset Paths + Policies
8. PV-010 Org Admin Staff Management
9. PV-009 Appearance UX Improvements
10. PV-023 Personalized Invite Acceptance + Workspace Setup UX
11. PV-024 Marketing Homepage for Adult Schools
12. PV-011 Storage Usage Dashboard
13. PV-026 Mobile Sidebar Drawer Navigation
14. PV-020 Multi-View Modes (Collection/Grid/Table/Compact)
15. PV-022 Content Reordering + Move Operations
16. PV-019 Iconography Section Completion (MVP)
17. PV-016 UI Stabilization + Usability Validation
18. PV-027 UI Consistency QA Checklist + Audit Pass
19. PV-028 End-User Guide (PhotoVault Navigation + Tasks)
20. PV-029 Private Beta Deployment + School Testing Cycle
21. PV-030 Production Readiness Code Review Gate (Pre-Go-Live)
22. PV-034 Cloudflare Production Hardening
23. PV-025 Vercel Production Deployment (Go-Live)
24. PV-018 Billing + Plan Boundaries (pre-paid onboarding gate)
25. AI-01 Metadata Q&A Assistant
26. AI-02 Internal Knowledge Assistant
27. PV-031 Integrations Hub (Google Drive + External Connectors)
28. PV-032 Customer-Facing Product Roadmap Page (High-Level)
29. PV-033 TinaCMS Integration (SuperAdmin-Only Marketing + Help Content)
30. PV-035 Paper.design Evaluation for Marketing Workflow
31. PV-037 Internal Component Library + Design System Pass
32. PV-036 Post-Launch Lessons Learned + Build Workflow Retrospective

### Temporary Execution Note (Approved)
- Before starting PV-018, run a short beta validation cycle with selected schools.
- Purpose: gather real-world UX/workflow feedback and fix high-priority issues before enforcing billing/plan boundaries.
- PV-018 remains a hard gate before paid onboarding at scale.

## Current Position
- Completed: PV-000, PV-001, PV-002, PV-003, PV-004, PV-005, PV-006, PV-007, PV-008, PV-009, PV-010, PV-011, PV-017, PV-019, PV-020 (MVP scope), PV-023, PV-024
- In Progress: none
- Deferred (intentional): PV-018 until beta feedback pass is complete
- Next active step: Beta School Testing Pass (pre-PV-025/PV-018)
- Remaining steps in lockstep sequence: 15
- Beta checklist template: `/Users/zylstra/Documents/photovault/docs/beta-school-feedback-checklist.md`
- Beta deployment checklist: `/Users/zylstra/Documents/photovault/docs/private-beta-deployment-checklist.md`

## Recent Completed Enhancements (Implemented)
- Global workspace shell:
  - added shared top-right profile menu for all users/pages
  - menu includes: user identity + role, Help, Questions/feedback, Billing (disabled/coming soon), `Settings (Profile)`, Logout
  - Super Admin quick access moved into profile menu (super-admin users only)
  - centralized header actions by moving duplicated `Appearance`, `Super admin`, and `Sign out` links into profile menu
  - improved profile header layout for long emails/names (clean truncation + role badge alignment)
  - added `/settings/profile` page for account-level profile edits (display name)
  - profile save writes to Supabase auth user metadata (`full_name` + `name`)
- Photos page:
  - explicit empty-state upload CTA in drop zone
  - drag-and-drop hover flicker fix (stable drag state)
  - single and bulk photo delete actions with confirmation
- Login page:
  - updated to production-facing copy
  - improved button affordance (hover/focus/pointer states)
  - cleaner light card presentation
- Super Admin page:
  - dedicated super-admin sidebar (separate from client org sidebar)
  - `Client Brand Portals` card-based overview with logo/color/counters
  - `School Operations` grouped panel for create + invite workflows
  - organization invite-status badges (`Needs invite`, `Invite sent`, `Admin accepted`)
  - invite dropdown hides orgs with accepted admins
  - `Create School` guidance now points to invite workflow + PV-023 context
  - per-school invite template editor (`subject`, `body`, `signature`) with placeholders + live preview
  - quick actions added for opening active/per-org audit logs
  - added `Homepage CMS` route for live marketing page content editing
  - homepage editor supports:
    - copy updates without code edits
    - feature image upload (storage-backed)
    - version history + restore
- Staff Management page:
  - new `/settings/users` for owner/super-admin staff invites and deactivation
  - invite roles scoped to `uploader` and `viewer`
- Terminology updates:
  - user-facing rename from `Brand Guidelines` to `Brand Portal` (routes unchanged)
- Albums page:
  - search moved to top toolbar
  - sort dropdown and view controls (`Grid`/`List`)
  - 4-column desktop grid for album cards
  - album-level share flow moved from photo page to albums cards:
    - `Share` button added next to `Choose cover` (grid + list cards)
    - modal share management pattern aligned with `Choose cover` popup
    - supports create/copy/revoke share links at album-card level
- Photos page:
  - 4-column desktop grid for photo cards
  - redesigned photo cards with image-overlay actions (`Select`, `View`, `Download`, `More`)
  - reduced metadata density and removed overcrowded bottom action row
  - added `Edit` action in photo menu and list actions
  - added right-side `Asset Details` drawer with:
    - preview
    - editable asset name
    - add/remove tags
    - per-asset metadata fields (`event_type`, `campus`, `photographer`)
    - save/cancel + unsaved-changes guard
    - read-only technical details (`created`, `updated`, format, size, dimensions, taken-at)
  - `Updated` timestamp is now DB-backed and persistent across refreshes (`assets.updated_at`)
  - Share Album box removed from `/albums/[id]` after move to albums-level workflow
  - added upload policy helper text clarifying:
    - photos page accepts image uploads only
    - PDF/doc uploads should use Brand Portal
- Icon system:
  - shared icon primitives introduced and applied to sidebar nav + key action controls
- Invite/setup experience:
  - setup page now renders personalized invite message content during onboarding
  - fallback + error states implemented for slower first-time setup
- Public homepage:
  - added `Security Highlights` section aligned to school buyer concerns
  - includes encryption, role-based access, secure sharing controls, audit visibility, backups/PITR, and compliance notes
  - normalized buyer-facing copy to match in-app terms (`Brand Portal`, `Appearance`, `Share Album links`)
  - updated homepage CMS helper text for clearer non-technical editing workflow
  - added one-click `Apply recommended defaults` action in `/super-admin/homepage` to reset editor state to the latest optimized copy baseline before saving

## Notes
- Use migration files for every DB change.
- Keep RLS updates in same migration as schema change where possible.
- Add a short QA checklist per ticket (owner/uploader/viewer/super-admin test matrix).
