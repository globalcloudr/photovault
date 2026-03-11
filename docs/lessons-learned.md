# PhotoVault Lessons Learned

Use this document after launch to capture what should become standard for the next product build.

## Keep
- Use a live, GitHub-connected Vercel beta environment early. It surfaced production-only TypeScript, auth, and rendering issues that local development did not catch.
- Commit by logical unit of work and use clear outcome-based commit messages. That made redeploys, rollback reasoning, and issue tracking much easier.
- Keep school taxonomy fields org-scoped and controlled. `Program / Department` works better as a managed org list than as free text.

## Change
- Treat Vercel environment variables as a first-class deployment step. The project build can look correct and still fail if the variables were entered during setup but never saved into Project Settings.
- After changing Vercel environment variables, always trigger a fresh deployment and verify the new deployment is tied to the latest Git commit hash before trusting the error log.
- For multi-tenant asset tables, do not assume intended RLS policies exist just because they are documented elsewhere. Add explicit migrations for live policies and verify the database state.
- Treat homepage styling and font loading as production concerns. Client-injected marketing CSS caused a visible first-paint flash until the styles were moved into the normal app stylesheet path.
- When changing default seed data for new schools, include a backfill migration for existing orgs in the same workstream.
- Document clearly whether a behavior is code-managed or CMS-managed. Homepage copy and images can appear “unchanged” if the database content is overriding the new code defaults.

## Avoid Next Time
- Avoid relying on client-side state for database-derived sequencing like `assets.sequence_number`; use the database as the source of truth.
- Avoid deleting storage files unless the matching database rows were actually deleted. Partial delete behavior creates orphaned asset rows and broken previews.
- Avoid debugging the wrong Vercel deployment. Always check the deployment source commit before acting on a build error.
- Avoid UI helper text that promises “can be changed later” before the edit path actually exists in the product.
- Avoid using checkbox-style affordances for actions that are not true selection states. Album `Select` worked better once it was treated as an explicit drawer/open action.

## Build Workflow Notes

### 1. How to connect VS Code to the correct project folder
- Open the actual repo folder in VS Code, not a random parent folder unless you intentionally want multi-repo access.
- For PhotoVault, the working folder is:
  - `/Users/zylstra/Documents/photovault`
- If VS Code is opened to the wrong folder, Git, file paths, terminal commands, and source control will all become confusing.
- Standard check:
  - confirm the Explorer shows the expected app files such as `src/`, `docs/`, `package.json`
  - confirm the integrated terminal opens in the repo root

### 2. How to connect the project folder to GitHub for commits and pushes
- Initialize or verify Git in the project folder.
- Confirm the current branch and remote:
  - `git status`
  - `git remote -v`
- If needed, connect the GitHub repo as `origin`.
- Standard commit flow:
  - stage files
  - write a clear commit message
  - commit
  - push to `origin/main`
- Standard verification:
  - GitHub should show the latest commit hash and changed files before any deployment step

### 3. What is a good number of edits before making a commit
- Commit by **logical unit of work**, not by arbitrary file count.
- Good commit boundaries:
  - one bug fix
  - one UI improvement
  - one docs update group
  - one deployment/configuration change
- Avoid waiting too long and bundling many unrelated changes into one commit.
- Practical guideline:
  - if the changes can be described by one clear commit message, they likely belong in one commit
  - if you need the word “and” multiple times in the commit message, the change may be too broad
- For active product work, smaller commits are usually better:
  - easier to review
  - easier to troubleshoot
  - easier to redeploy safely

### 4. Commit message guideline
- Use a commit message that describes the main logical outcome of the change.
- Good pattern:
  - `Verb + outcome`
- Examples:
  - `Fix beta deployment TypeScript blockers`
  - `Polish super admin card actions`
  - `Update homepage demo CTA and login navigation`
  - `Add private beta deployment checklist`
- Practical rule:
  - if one short sentence clearly describes the work, the commit is probably scoped well
  - if the message needs many unrelated ideas joined together, the commit may be too broad

### 5. Vercel beta deployment note
- In Vercel, `Production` means the primary environment for that specific project.
- A beta-only project such as `photovault-beta` can still use its own `Production` environment safely during private beta.
- This is separate from the final public go-live decision and separate from the later production domain strategy.

### 6. Beta issue patterns already discovered
- Private beta surfaced production-only TypeScript issues that did not block local iteration. A Vercel build should be treated as a real validation gate, not a formality.
- Asset upload and delete workflows need database-first safety checks:
  - explicit `assets` RLS policies must exist in Supabase
  - upload retries must handle orphaned storage objects
  - deletes must confirm database rows were removed before cleaning up storage

## Suggested Questions To Answer After Launch
- What decisions saved the most time?
- What caused the most rework?
- Which parts of the workflow felt unclear or fragile?
- Which deployment issues should be turned into a repeatable checklist?
- What documentation was missing when it was needed most?
- What should be standardized before the next product starts?
