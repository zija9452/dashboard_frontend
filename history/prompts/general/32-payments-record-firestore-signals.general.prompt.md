---
id: 32
title: Payments Record Firestore signals
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "notifications", "firestore", "badge"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - backend/src/utils/firestore_signals.py
 - backend/src/models/payment_proof.py
 - backend/add_required_tables_in_database/add_payment_proofs.py
 - backend/src/routers/cash_deposit.py
 - backend/src/routers/payment_proof.py
 - backend/src/routers/customer_invoice.py
 - frontend/components/CashDepositBadge.tsx
 - frontend/lib/paymentMethods.ts
 - frontend/app/(pages)/cash-deposits/page.tsx
 - PAYMENTS_RECORD_PLAN.md
tests:
 - migration (rejection_seen_at) on both DBs; column present on both
 - npx tsc --noEmit (clean); eslint: same set-state-in-effect pattern as the shop order badges
 - rolled-back test: cashier badge 1 after online payment, 1 after reject, unchanged when admin opens, 0 when cashier opens
---

## Prompt

ok , lekin hm to pending and reection pr signals den ge na , k koi new entry sales and admin ko badge and reject to casher ko signal , or pending hi rhe to badge dikhta rhe , isi trha rejection ka bhi ,

kia flow he ??

## Response snapshot

The Payments Record badge now uses the same Firestore signals as shop orders.

Two signals per branch:
- review → sales/admin: new or resubmitted deposit, screenshot upload, approve, reject;
- cashier → cashier: reject, online payment without a screenshot, resubmit, seen.

Badge behaviour:
- it refreshes instantly on its signal, with a 15-minute poll as fallback;
- it is count-based, so it stays while anything is still pending or rejected.

A rejected online payment cannot be fixed, so it stays in the cashier badge until a cashier opens it once (new column `rejection_seen_at`, added by migration on both DBs). The flow was explained to the user.

## Outcome

- ✅ Impact: Sales/admin and cashier get live badge updates on the live site
- 🧪 Tests: migration, tsc, rolled-back badge test
- 📁 Files: 10
- 🔁 Next prompts: deploy, then live test of instant badge on both branches
- 🧠 Reflection: local has no Firestore creds, so the instant update shows only after deploy

## Evaluation notes (flywheel)

- Failure modes observed: bash heredoc again; used Write for the patch script
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
