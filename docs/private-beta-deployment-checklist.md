# PhotoVault Private Beta Deployment Checklist

Use this checklist when preparing the live beta environment for pilot schools.

## 1. Beta Environment Setup
- Create or connect the PhotoVault project in Vercel.
- Confirm the beta domain/URL to use for testing.
- Add production-like environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Verify the variables are actually visible in `Project Settings -> Environment Variables` after saving.
- Verify no environment values point to localhost.

## 2. Supabase Auth Configuration
- Add the beta site URL to Supabase Auth site settings.
- Add allowed redirect URLs for:
  - login flow
  - invite acceptance flow
  - password reset flow
- Verify invite acceptance lands on the beta environment, not localhost.
- Verify password reset emails return to `/reset-password` on the beta domain.

## 3. Core Route Smoke Test
- Load `/`
- Load `/login`
- Sign in and reach `/albums`
- Open `/super-admin`
- Accept a school invite on the beta domain
- Run password reset from the beta domain

## 4. Org and User Readiness
- Confirm at least 2 pilot school orgs are ready.
- Confirm each pilot school has:
  - school created
  - owner/admin invite sent
  - working login
  - at least one starter album if needed for walkthrough
- Confirm Super Admin can still switch orgs and audit activity.

## 5. Feature Validation for Pilot Schools
- Create album
- Edit album details and verify the drawer shows the current cover preview
- Upload photos by button
- Upload photos by drag/drop
- Search and sort albums/photos
- Switch Grid/List view
- Edit photo metadata in asset drawer
- Create and revoke album share links
- Delete photos and re-upload a fresh batch in the same album
- Confirm album `Program / Department` options are correct for the school and editable from Settings
- Update Brand Portal content
- Update Appearance settings
- Invite and remove staff
- Log out and confirm logout completes on the first click
- Load the homepage and confirm there is no first-paint unstyled flash on the live beta domain

## 6. Beta Feedback Process
- Create one copy of `docs/beta-school-feedback-checklist.md` per pilot school/session.
- Record all blocking issues with severity.
- Group issues into:
  - fix before production
  - acceptable for beta
  - future roadmap

## 7. Go/No-Go Review
- Count open `Critical` issues.
- Count open `High` issues.
- Decide whether beta can continue, expand, or pause.
- Record decision in `docs/mvp-implementation-board.md` or release notes.

## 8. Exit Criteria Before Production
- At least 2 pilot schools complete key workflows successfully.
- No open critical issues.
- High-priority issues triaged and assigned.
- Invite, login, share, and password reset flows verified on live beta domain.
