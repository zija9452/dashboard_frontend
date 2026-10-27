---
id: 52
title: Walk-in customer default after save
stage: general
date: 2026-10-27
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["walkin-invoice", "customer", "ux"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/app/(invoices)/walkin-invoice/page.tsx
tests:
 - none
---

## Prompt

hr invoice create hone k bd select ho jaye walkin customer , walkin invoice me ,

## Response snapshot

After a walk-in invoice saved, the form reset did setSelectedCustomer(''), which left the customer empty. It now looks up the "Walk-in Customer" in the loaded customers list (the same match used on page load) and selects it, the same way the salesman resets to Suleman.

## Outcome

- ✅ Impact: Customer dropdown goes back to Walk-in Customer after every saved invoice
- 🧪 Tests: none run (not tested in browser)
- 📁 Files: walkin-invoice/page.tsx (post-save reset block)
- 🔁 Next prompts: fix UTC default date on walk-in page
- 🧠 Reflection: the page-load default and the post-save reset had drifted apart

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
