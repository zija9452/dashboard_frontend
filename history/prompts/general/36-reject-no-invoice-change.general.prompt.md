---
id: 36
title: Reject does not change invoice
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "payment-proofs", "customer-invoice"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - backend/src/routers/payment_proof.py
 - frontend/app/(pages)/cash-deposits/page.tsx
 - PAYMENTS_RECORD_PLAN.md
tests:
 - backend import ok; npx tsc --noEmit (clean)
 - rolled-back test (LH): customized online payment then reject → amount paid, balance and history unchanged, proof REJECTED
---

## Prompt

or customized me bhi reject pr bill nhi bdle ga?

customized me bhi record change na kro rejection pr

## Response snapshot

Reject no longer changes any invoice, customized or walk-in. It only sets the proof to REJECTED with a reason. Removed the payment-reversal code and the refund check. The Payments Record reject note now says the bill stays as it is and staff should follow up with the customer.

## Outcome

- ✅ Impact: Reject is a flag only; reports and balances never move on reject
- 🧪 Tests: import, tsc, rolled-back test
- 📁 Files: 3
- 🔁 Next prompts: browser test, deploy
- 🧠 Reflection: the Duplicate Bill question is moot now (nothing changes on reject)

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
