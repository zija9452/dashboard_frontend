---
id: 1
title: Static branch list for login and switcher
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["multi-branch", "login", "neon-cold-start"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/lib/branch.ts
 - frontend/app/login/page.tsx
 - frontend/components/BranchSwitcher.tsx
tests:
 - npx tsc --noEmit (no errors in edited files)
---

## Prompt

ok , styatic de do phr ,

## Response snapshot

Added a static `BRANCHES` list (lighthouse, karimabad) in `lib/branch.ts`. The login page and BranchSwitcher now use it instead of fetching `/api/auth/branches`, so the dropdown shows even while the backend or Neon DB is waking up.

## Outcome

- ✅ Impact: Branch dropdown no longer empty on cold start
- 🧪 Tests: tsc clean for edited files
- 📁 Files: 3 frontend files
- 🔁 Next prompts: Make backend startup not block on DB (initialize_database in background)
- 🧠 Reflection: Root cause is backend lifespan awaiting LH DB; static list hides it only for the dropdown

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): tsc PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Run initialize_database as a background task with retry
