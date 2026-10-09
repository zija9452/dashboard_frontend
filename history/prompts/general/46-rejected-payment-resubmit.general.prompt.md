---
id: 46
title: Rejected payment resubmit flow
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "badge", "workflow"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - backend/src/routers/payment_proof.py
 - backend/src/models/payment_proof.py
 - backend/add_required_tables_in_database/add_payment_proofs.py
 - frontend/lib/paymentMethods.ts
 - frontend/components/CashDepositBadge.tsx
 - frontend/components/PaymentProofCell.tsx
 - frontend/app/(pages)/cash-deposits/page.tsx
 - PAYMENTS_RECORD_PLAN.md
tests:
 - migration on both DBs (rejection_seen_at dropped)
 - pyflakes, import, tsc, eslint clean
 - rolled-back KA test: cashier badge 2 = Rejected list 2; resubmitting EK-0002 → PENDING, reason cleared; cashier badge 1, admin badge +1
---

## Prompt

rejected nhi gini ja rhi kia ? cashier me default to whi he , dp he entries count 1 a rha he badge pr

jb tk ye pending me na ajye badge me hi cpount rhe is ka bhi , same flow pr chlo na

## Response snapshot

Cause: EK-0002 was rejected and the cashier had already opened it. The "seen" rule had removed it from the badge.

Changed to the deposit flow:
- A rejected online payment stays in the cashier badge until a new pay slip is attached.
- Attaching it resubmits the payment: it goes back to PENDING and the reject reason is cleared.

Code changes:
- Removed the seen logic: the /seen endpoint, the frontend call and the rejection_seen_at column (dropped on both DBs).
- The cashier badge now equals the Rejected list.
- Upload is allowed on REJECTED, in Payments Record and in Customer Payment History.

## Outcome

- ✅ Impact: Rejected payments behave like rejected deposits; badge matches list
- 🧪 Tests: migration, static checks, rolled-back test
- 📁 Files: 8
- 🔁 Next prompts: browser test
- 🧠 Reflection: left the user's "Follow up with the customer" text unchanged

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
