---
id: 19
title: Online payment proof plan
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "customer-invoice", "customer-payment", "cash-deposits", "plan"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - none (plan only)
tests:
 - none
---

## Prompt

ok , explore my whole project and is me jb hm ek customized ki invoice bnaty hen to payment method puchty hen to kia ye possible he k agr online payment ho jese easypaise bank ki , to us invoice k bd hm payment prrof k liye ss len , jese cash deposit me hota he nazar ati he or notification , or cash deposit tab ka nam change kr dena qk us me phr customied ki bhi payments ayen gi or walkin ki bhi , to ye kese possible he ? or is ka fow kia hona chahiye he ?? or is k ilawa customized ki jo partial payments ayen gi jo k is page pr entry krte hen to http://localhost:3000/customer-payment is page pr , wo kese handle kren ge , sirf plan btao complete explore kro

## Response snapshot

Plan only, no code changed. The Cash Deposits tab becomes "Payment Proofs" with two tabs: Bank Deposits (as today) and Online Payments. A new payment_proofs table (PAY-/KPAY-) is linked to an invoice (customized or walk-in) and one payment entry; payments_history entries get a payment_id. An online payment (Easypaisa / bank) needs a screenshot at Pay and Bill and on the customer-payment page. It counts at once and is marked pending; Sales/Admin approve it, or reject it with a reason, which reverses the payment. The existing badge and dashboard banner count these too. Edge cases and open decisions were listed.

## Outcome

- ✅ Impact: Flow and phases agreed before any code
- 🧪 Tests: none
- 📁 Files: 0
- 🔁 Next prompts: user decisions on open questions, then implement
- 🧠 Reflection: payments_history is JSON with no ids, so a payment_id is needed to link a proof

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
