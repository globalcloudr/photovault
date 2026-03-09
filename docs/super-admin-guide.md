# PhotoVault Super Admin Guide - v1 Draft

## Purpose
This guide is for platform-level administrators who manage multiple schools in PhotoVault.

## Super Admin Responsibilities
- create school organizations
- invite each school’s primary admin (owner)
- switch active organization context
- configure appearance per school
- edit public homepage copy/media from Homepage CMS
- help troubleshoot school setup issues

## Accessing Super Admin
1. Sign in with your super admin account.
2. Open `/super-admin`.
3. Confirm you can see:
- `Client Brand Portals`
- `School Operations`
- hero header with platform status chips

If you cannot access this page, your account may not be marked as super admin.

## Create a School
1. In `Create School`, enter:
- School name
- Slug (lowercase + hyphens)
2. Click `Create school`.
3. Verify the school appears in `Client Brand Portals`.
4. Set it as active with `Switch to org`.
5. Continue to `Invite School Admin` to send access.

## Invite School Admin (Owner)
1. In `Invite School Admin`:
- Select organization
- Enter admin email
2. Click `Send invite`.
3. Confirm success message.

Expected result:
- invite email is sent
- invited user is assigned owner membership for that org
- organizations with an accepted owner/admin are removed from the invite dropdown

Invite customization:
- Use `Invite Message Template` in the same panel to edit:
  - subject
  - body
  - signature
- Supported placeholders:
  - `{{school_name}}`
  - `{{invitee_email}}`
  - `{{sender_name}}`
- Templates are saved per school organization.

## Switch Active Organization
Use either:
- `Set active org` in a client portal card’s `More actions` menu
- `Open Brand Portal` / `Open workspace` from a client portal card (also sets context)

Why this matters:
- albums, appearance, and other org-scoped operations use the active org.
- privacy-first super-admin view defaults to portal identity, counts, and controls rather than browsing client media by default

## Organization Status Badges
Each client portal card includes an onboarding status badge:
- `Needs invite`: no owner invite/membership yet
- `Invite sent`: owner membership exists but admin has not accepted/signed in
- `Admin accepted`: at least one owner has accepted and accessed the workspace

## Super Admin Page Layout
- Top utility header with:
  - Support link
  - shared user profile menu (identity/actions)
  - profile menu includes `Settings (Profile)`, `Logout`, and `Super Admin` shortcut
  - `Billing` is intentionally disabled/coming soon
- Dedicated super-admin sidebar (not client-org sidebar) with:
  - admin nav
  - platform snapshot
  - support links (`Access Management`, `Help`)
- Main content area with:
  - hero header block
  - `Client Brand Portals` overview cards (brand color, logo, counts)
  - `School Operations` section (create + invite)

## Homepage CMS (Public Site Content)
1. Open `/super-admin/homepage`.
2. Edit sections:
- Hero
- Why + Testimonials
- Security Highlights
- Feature sections
- CTA + Footer
3. For feature images:
- paste an image URL, or
- upload directly in the feature block (stored as a storage reference)
4. Click `Save changes`.
5. Open `/` to verify live homepage content.

Versioning:
- each save stores the previous homepage state
- use `Version History` to restore older content snapshots

## Configure School Appearance
1. Switch to the target org.
2. Open `/settings/branding` (Appearance in navigation).
3. Edit colors/logo/font fields.
4. Click `Save appearance`.
5. Refresh page if needed to confirm visual updates.

Important:
- `Appearance` (`/settings/branding`) is org-level branding.
- `Settings (Profile)` in the profile menu opens `/settings/profile` for account-level name updates.

## Configure Brand Portal Collection
1. Switch to the target org.
2. Open `/collections/brand-guidelines`.
3. Upload logo versions and portal documents.
4. Confirm files are visible for staff reference.

## Recommended Onboarding Workflow Per School
1. Create school organization.
2. Switch to that org.
3. Set initial appearance.
4. Add baseline files to Brand Portal.
5. Invite school owner/admin.
6. Have school owner invite additional staff.

## Common Issues
- `Forbidden` when inviting:
  - your account may not be super admin
- invite appears sent but user not linked:
  - verify memberships row exists for org/user
- appearance not changing:
  - ensure correct org is active
  - save appearance again and refresh
- school user sees no albums:
  - verify user has membership in that organization

## Data to Capture for Support
When reporting a problem, capture:
- user email
- school/org name and org ID
- action attempted (create org, invite, appearance save, guideline upload, etc.)
- action attempted (create org, invite, appearance save, brand portal upload, etc.)
- exact error message
- timestamp and timezone
