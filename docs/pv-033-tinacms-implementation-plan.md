# PV-033 TinaCMS Implementation Plan

## Recommendation

Use TinaCMS in two stages.

### Stage 1: Implement now under PV-033

Use TinaCMS only for **SuperAdmin-managed global content**:

- homepage marketing copy
- help and user-facing documentation
- customer-facing roadmap / changelog copy

Keep the following in Supabase:

- albums
- photos
- users
- memberships
- share links
- appearance settings
- current Brand Portal runtime data

This is the correct first implementation for the current codebase.

### Stage 2: Optional future extension

Use TinaCMS for **premium custom Brand Portals** only, not for every school by default.

That means:

- default schools continue using the current React + Supabase Brand Portal
- premium branding clients can get a Tina-authored custom guideline
- schools view the portal, but do not edit Tina content directly

This second stage should not be part of the initial PV-033 delivery.

---

## Why This Is The Best Fit

The external architecture note is directionally good, but it assumes Tina should become a school-level content system immediately.

That is not the best fit for how PhotoVault is currently built.

Current reality:

- Homepage content is already moving toward editable CMS-managed content.
- The Brand Portal route already exists at `/collections/brand-guidelines`.
- Brand Portal assets and notes are currently org-scoped and stored in Supabase Storage plus config state.
- The app is multi-tenant and permission-sensitive.

If Tina is pushed into school-level Brand Portals too early, you take on:

- Git-backed per-school content complexity
- deployment coupling for content edits
- harder tenant isolation review
- a mixed operational/editorial architecture before the global content workflow is proven

The better sequence is:

1. prove Tina on global SuperAdmin-only content
2. validate editorial workflow
3. optionally extend Tina to premium custom Brand Portal content later

---

## Opinion On The External Architecture Note

### What is correct

- React/Tailwind should continue to own layout and UI.
- Tina should manage structured content, not runtime DAM behavior.
- Structured content fields are better than one long Markdown body.
- Schools should view content; editing should stay controlled.

### What should change for PhotoVault

- Do not make Tina the default source for all Brand Portals yet.
- Do not replace the current `/collections/brand-guidelines` implementation in PV-033.
- Do not make school-specific Git content part of the first Tina rollout.

### Best adaptation

Use the note as the blueprint for a **future premium custom portal mode**, not for the initial Tina integration.

---

## Current Brand Portal Fit

The current Brand Portal already behaves like an org-scoped application surface:

- hero image upload
- logo library
- icon library
- document uploads
- typography notes
- do/don't notes
- quick jump sections

That makes it closer to runtime tenant data than to public marketing copy.

For that reason, the current Brand Portal should remain Supabase-backed for now.

If custom Tina-managed portals are added later, the model should be:

- `portalMode = "template"` -> current Supabase-backed Brand Portal
- `portalMode = "custom"` -> Tina-authored premium guideline rendered in React

But that is a later phase.

---

## PV-033 Scope

### In scope

- Tina config in repo
- Tina collections for:
  - homepage content
  - help/docs content
  - customer-facing roadmap content
- SuperAdmin-only editor access
- Git-backed content workflow
- Vercel deployment flow from Git changes

### Out of scope

- albums / photos / DAM runtime data
- staff / auth / memberships
- school-specific operational settings
- replacing the current Brand Portal
- school self-service Tina editing

---

## Recommended Content Structure

### Tina-managed content

```text
content/
  marketing/
    home.mdx
    roadmap.mdx
  help/
    user-guide.mdx
    faq.mdx
    release-notes.mdx
```

### Keep in Supabase

```text
public.marketing_pages
public.marketing_page_versions
public.org_invite_templates
public.audit_events
public.albums
public.assets
storage.objects
```

Note:

The current `marketing_pages` table can either remain temporarily during migration or be retired after Tina fully takes over homepage/help copy. Do not migrate runtime data into Tina.

---

## Implementation Sequence

### Phase 1: Foundation

- install TinaCMS in the Next.js app
- add Tina config and collections
- store Tina content in repo under `content/`
- add a restricted editor entrypoint for SuperAdmin-only use

### Phase 2: Homepage migration

- migrate homepage copy from current content model into Tina-managed content
- keep the existing React homepage renderer
- change the renderer to read Tina content instead of the current DB-backed source for the selected sections

### Phase 3: Help/docs migration

- move user guide and related customer-safe help content into Tina collections
- keep operational/internal docs in `docs/` if they are not meant for Tina editing

### Phase 4: Roadmap / changelog

- move customer-facing roadmap content to Tina
- keep internal implementation board separate

---

## Access Model

Tina editor should be available to:

- SuperAdmin only

It should not be available to:

- school owners
- uploaders
- viewers
- public users

This should be enforced by app-level auth/guard logic, not by assumption.

---

## Deployment Model

Recommended workflow:

1. SuperAdmin edits approved content
2. Tina writes changes into Git-backed content
3. changes commit to repo / branch
4. Vercel deploys updated site

This matches the Git-based workflow you want and preserves version history.

---

## Risks

### Risk 1: Two CMS systems at once

PhotoVault already has Supabase-backed editable homepage content.

Mitigation:

- use PV-033 to deliberately decide which content source wins
- avoid half-migrated ownership

### Risk 2: Extending Tina into tenant runtime too early

Mitigation:

- keep Brand Portal on Supabase for now
- treat Tina custom portals as a later premium feature

### Risk 3: Access confusion

Mitigation:

- no Tina editor links in school workspaces
- SuperAdmin-only entrypoint

---

## Future Extension: Premium Brand Portals

If later implemented, use Tina for premium brand redesign clients only.

Recommended structure:

```text
content/
  brand-portals/
    smace/
      index.mdx
    vcaec/
      index.mdx
```

Recommended runtime logic:

- add `portal_mode` on the org record or portal config
- `template` -> current Brand Portal
- `custom` -> Tina-authored custom portal

Recommended rendering path:

- keep route as `/collections/brand-guidelines`
- branch rendering by portal mode inside the React route

This is better than introducing a second school-facing route pattern right now.

---

## Final Recommendation

For PV-033, implement TinaCMS as:

- a **SuperAdmin-only Git-based editorial system**
- for **homepage, help, and customer-facing roadmap content**

Do **not** use PV-033 to replace the current school Brand Portal architecture.

If premium custom Brand Portals are desired later, add them as a separate extension after the initial Tina workflow is proven.
