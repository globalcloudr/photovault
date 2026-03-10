# PhotoVault Lessons Learned

Use this document after launch to capture what should become standard for the next product build.

## Keep
- Add lessons here after launch.

## Change
- Add lessons here after launch.

## Avoid Next Time
- Add lessons here after launch.

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

## Suggested Questions To Answer After Launch
- What decisions saved the most time?
- What caused the most rework?
- Which parts of the workflow felt unclear or fragile?
- Which deployment issues should be turned into a repeatable checklist?
- What documentation was missing when it was needed most?
- What should be standardized before the next product starts?
