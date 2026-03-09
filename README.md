# PhotoVault

PhotoVault is a multi-organization photo vault / DAM for adult schools, built with Next.js + Supabase.

## Current Product Scope
- School organizations with org-scoped albums and assets
- Upload, browse, open, and download photos
- Album cover selection from album photos
- Per-organization appearance settings (theme tokens + logo URL)
- Brand Guidelines collection for logos and reference documents
- Super Admin workflows for school/org creation and owner invite
- Shared Media Workspace UI shell (top header + left sidebar + right content area)

## App Routes
- `/albums` - albums dashboard
- `/albums/[id]` - album photos workspace
- `/settings/branding` - org appearance settings
- `/collections/brand-guidelines` - brand guidelines library
- `/super-admin` - platform org management (super admin only)

## Local Development
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment
Use `.env.local` for Supabase project keys and app settings.

## Documentation
- [UI Concept Brief](/Users/zylstra/Documents/photovault/docs/ui-concept-brief.md)
- [MVP Implementation Board](/Users/zylstra/Documents/photovault/docs/mvp-implementation-board.md)
- [Style Guide](/Users/zylstra/Documents/photovault/docs/style-guide.md)
- [User Guide](/Users/zylstra/Documents/photovault/docs/user-guide.md)
- [Super Admin Guide](/Users/zylstra/Documents/photovault/docs/super-admin-guide.md)
- [Design Resources](/Users/zylstra/Documents/photovault/docs/design-resources.md)

## Next Priorities
- Role and RLS hardening (`owner`, `uploader`, `viewer`)
- Metadata + filters improvements for asset findability
- Appearance upload UX (replace manual logo URL entry)
- Usability validation pass with school users
