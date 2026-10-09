---
id: 30
title: Cashier reject notification
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "cash-deposits", "notifications", "explainer"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - none
tests:
 - none
---

## Prompt

notification nhi ata kia ?? cashier ko rejected ka ?

## Response snapshot

Today the cashier only gets the red sidebar badge on Payments Record. It loads once, on page load or refresh, and there is no polling (to keep Neon compute low), so a reject made while the cashier is logged in shows only after a refresh. There is no dashboard banner for the cashier. Offered:
- a cashier dashboard banner;
- a badge refresh on every page change and when the tab gets focus, which is cheap.

## Outcome

- ✅ Impact: User knows current notification behaviour
- 🧪 Tests: none
- 📁 Files: 0
- 🔁 Next prompts: user choice on banner / badge refresh
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
