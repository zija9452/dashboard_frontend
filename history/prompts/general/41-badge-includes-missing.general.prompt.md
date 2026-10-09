---
id: 41
title: Badge includes missing pay slips
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "badge", "notifications"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/components/CashDepositBadge.tsx
 - backend/src/routers/customer_invoice.py
 - backend/src/routers/walkin_invoice.py
 - PAYMENTS_RECORD_PLAN.md
tests:
 - KA DB counts: 1 deposit pending + 3 pay slips pending + 1 not attached = 5
 - backend import ok; tsc clean
---

## Prompt

badge 4 q 5 aye na pending or missing slip ko mila kr , 5 bn rhe hen , 4 aya he

## Response snapshot

Cause: the sales/admin badge counted pending deposits and pending pay slips, but not "pay slip not attached", while the Pending list includes those.
- The badge now also adds proofs_missing, so in Karim Abad it shows 5 (1 + 3 + 1).
- A new online payment without a pay slip now sends the review signal as well, so the sales/admin badge updates live.

## Outcome

- ✅ Impact: Badge matches the Pending list
- 🧪 Tests: DB count check, import, tsc
- 📁 Files: 4
- 🔁 Next prompts: browser check
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: badge formula not updated when Pending started including missing
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
