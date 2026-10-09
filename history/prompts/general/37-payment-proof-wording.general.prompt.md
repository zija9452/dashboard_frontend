---
id: 37
title: Payment proof wording
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "payment-proofs", "wording", "ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/lib/paymentMethods.ts
 - frontend/components/ProofImagePicker.tsx
 - frontend/components/PaymentProofCell.tsx
 - frontend/components/CashDepositBadge.tsx
 - frontend/app/(invoices)/customer-invoice/page.tsx
 - frontend/app/(invoices)/walkin-invoice/page.tsx
 - frontend/app/(pages)/customer-payment/page.tsx
 - frontend/app/(pages)/dashboard/page.tsx
 - frontend/app/(pages)/cash-deposits/page.tsx
 - backend/src/routers/payment_proof.py
tests:
 - grep: no user-facing "screenshot" left
 - npx tsc --noEmit (clean)
---

## Prompt

screeshot ki jga online payment record ka word use kr lo , sb jga , jese missing ss na aye , kchj professionbal keyword use kr lo

professioanl alfaz kon sa lgao ge ?

## Response snapshot

Replaced every user-facing "screenshot" with "Payment Proof" wording:
- Statuses: Proof Not Attached / Pending Verification / Verified / Rejected.
- Buttons: Attach Proof / + Attach Payment Proof.
- Field: "Payment Proof"; detail rows: "Proof Attached By", "Proof 1 of 2".
- Filters: "Proof Not Attached" and "Action Required" (the cashier default).
- Toasts, dashboard banner and backend messages use the same terms.

Code comments were left unchanged. The list of words was shown to the user.

## Outcome

- ✅ Impact: Consistent professional wording everywhere
- 🧪 Tests: grep, tsc
- 📁 Files: 10
- 🔁 Next prompts: user may adjust a word
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
