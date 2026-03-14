# PhotoVault – Current Engineering Handoff

This file captures the current working state of the project so that a new AI agent or developer can immediately understand what is happening in the codebase.

Do not overwrite history.  
Append new sessions at the top.

---

## Current Focus
PV-029 Private Beta Preparation

---

## Next Tasks
1. Finish mobile sidebar drawer
2. Validate beta school invite workflow
3. Test share link expiry
4. Final pass on albums grid styling
5. Run updated beta school feedback checklist with pilot schools

---

## Known Issues
- Albums background gradient appears too dark in grid view
- Occasional asset upload preview delay
- Mobile sidebar drawer is still outstanding for smaller screens

---

# Session Log

## 2026-03-14

### Work Completed
- Removed unused Appearance `Heading Font` and `Body Font` controls from the app
- Added user-controlled workspace text size options: `Small`, `Medium`, `Large`
- Wired workspace readability setting so it visibly changes app text sizing in-browser
- Added SQL cleanup to remove unused theme font columns from `org_theme_settings`
- Updated implementation/docs to reflect built-in fonts plus readability controls
- Expanded beta school feedback checklist to capture product-fit/adoption signal, not only usability issues

### Files Touched
src/app/settings/branding/page.tsx  
src/lib/theme.ts  
src/components/theme/theme-loader.tsx  
src/app/globals.css  
src/components/ui/typography.tsx  
src/components/ui/button.tsx  
src/components/ui/input.tsx  
src/components/layout/media-workspace-shell.tsx  
docs/user-guide.md  
docs/style-guide.md  
docs/mvp-implementation-board.md  
docs/beta-school-feedback-checklist.md  
docs/sql/2026-03-13-pv-034-remove-unused-theme-font-columns.sql

### Notes
- Appearance settings now align with actual app behavior: built-in fonts only, no dead font-family fields.
- Workspace text size is a client-side preference intended to improve readability during beta use.
- SQL cleanup for removed theme font columns has been created and applied.
- Beta checklist now supports validation of both usability and product demand alongside current school workflows.

## 2026-03-13

### Work Completed
- Albums grid layout improvements
- Brand Portal icon section implemented
- UI polish across albums page

### Files Touched
src/app/albums/page.tsx  
src/components/layout/media-workspace-shell.tsx  
docs/style-guide.md

### Notes
Grid layout updated to support consistent 4-column media view on desktop.


## Core Context

mvp-implementation-board.md: master implementation/status doc. Best first file for roadmap, completed work, active PV items, and acceptance criteria.
style-guide.md: UI rules and shared shell conventions. Important for any frontend change.
ui-concept-brief.md: explains the chosen UX direction, especially why the app uses the Media Workspace pattern.

## Product and Positioning

user-guide.md: what school users are supposed to be able to do today.
super-admin-guide.md: expected super-admin workflows and terminology.
canopy-brand-strategy.md: naming/brand architecture context.
pv-033-tinacms-implementation-plan.md: important when work touches CMS/content architecture.

## Validation and Operations

private-beta-deployment-checklist.md: deployment and smoke-test expectations.
beta-school-feedback-checklist.md: usability/test checklist for pilot schools.
lessons-learned.md: practical build/deploy/product mistakes to avoid repeating.

## Supporting Reference

design-resources.md: external design/accessibility references, useful but not usually first-pass context.
docs/sql/: source of truth for schema/policy changes that have been applied or should be applied.
