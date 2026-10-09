---
id: 23
title: Payments Record Phase 2 screenshot UI
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "payment-proofs", "customer-invoice", "customer-payment", "ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/lib/paymentMethods.ts
 - frontend/components/ProofImagePicker.tsx
 - frontend/components/PaymentProofCell.tsx
 - frontend/app/api/payment-proofs/proxy.ts
 - frontend/app/api/payment-proofs/[...path]/route.ts
 - frontend/app/api/payments-record/[[...path]]/route.ts
 - frontend/app/(pages)/customer-payment/page.tsx
 - frontend/app/(invoices)/customer-invoice/page.tsx
 - backend/src/routers/customer_invoice.py
 - PAYMENTS_RECORD_PLAN.md
tests:
 - npx tsc --noEmit (clean for changed files)
 - eslint (only pre-existing issues)
 - rolled-back DB transaction: online payment -> MISSING proof -> approve blocked -> reject reverses payment; data unchanged after
---

## Prompt

ok implement kro next phase

## Response snapshot

Phase 2 is done.
- One shared payment method list, with Islami Bank on both pages.
- For an online method (with amount > 0 on the invoice), a screenshot box (up to 3, optional) appears on Pay and Bill and on /customer-payment. The screenshots upload after the save.
  - If the upload fails, or no screenshot was given, the payment stays saved and the proof shows as "missing", with a message.
- The /customer-payment History modal has a Proof column with status, thumbnails (zoom) and an "Upload proof" button.
- Added Next proxies for /payment-proofs and /payments-record.
- An idempotent retry now also returns proof_id.

## Outcome

- ✅ Impact: Staff can attach payment screenshots now or later
- 🧪 Tests: tsc, eslint, rolled-back flow test
- 📁 Files: 10
- 🔁 Next prompts: Phase 3 (Payments Record list with Type filter, approve/reject, badge)
- 🧠 Reflection: browser upload to Cloudinary not yet tried

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
