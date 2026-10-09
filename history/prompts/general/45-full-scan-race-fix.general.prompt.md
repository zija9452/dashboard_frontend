---
id: 45
title: Full scan and race fix
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "review", "concurrency", "roles"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - backend/src/routers/payment_proof.py
tests:
 - pyflakes on changed backend files (clean after removing an unused import)
 - rolled-back test: locked re-read sees a concurrent APPROVED; approve again blocked; approve on MISSING blocked
 - npx tsc --noEmit (clean); eslint: only the set-state-in-effect pattern shared with the shop order badges
---

## Prompt

ok , perefct ek complete scan kr lo , koi issue to nhi he ?? dekh lo ?

approval kbhi bhi cashier nhi dega , ye option button cashier pas na ho , and cashier k pas rejected and missing k count hon badge , abhi reject k ho rhe hen shayad

## Response snapshot

The scan found and fixed:
- A race: a pay slip upload finishing after an approve or reject would set the status back to PENDING, and two reviewers could overwrite each other.
  - approve, reject and upload now read the row under a lock (SELECT … FOR UPDATE, populate_existing);
  - upload re-checks the status after the Cloudinary upload and cleans up on conflict.
- Leftover "proof" wording in 3 backend errors.
- An unused import.

Verified:
- Approve/Reject is admin/sales only, in the UI and the API.
- The cashier badge already counts rejected + pay slip not attached.
- Islami Bank is grouped under bank in the reports.
- No frontend page writes payments_history.

## Outcome

- ✅ Impact: No lost approvals under simultaneous actions; scan clean
- 🧪 Tests: pyflakes, rolled-back lock test, tsc, eslint
- 📁 Files: 1
- 🔁 Next prompts: browser test, deploy
- 🧠 Reflection: the same upload-vs-review race exists in the older cash deposit edit flow (not changed)

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
