---
id: 49
title: Cloudinary delete check
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "cloudinary", "explainer"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - none
tests:
 - grep of every Cloudinary delete call
---

## Prompt

ye entries delete hon gi to cloudinary se image bhi delete hon gi ?

## Response snapshot

Yes. Every path that deletes an image also removes it from Cloudinary:
- a pay slip removed in the panel (payment_proof.py:297);
- a customized invoice delete (customer_invoice.py:1655-1661);
- a walk-in bill delete (walkin_invoice.py:531-536);
- a failed upload (payment_proof.py:263/294);
- a deposit slip removed on edit (cash_deposit.py:497).

Previews that were never uploaded are not on Cloudinary. A Cashier Deposit has no delete option. If a Cloudinary call fails it is only logged, so the image could stay on Cloudinary.

## Outcome

- ✅ Impact: User knows images are cleaned up
- 🧪 Tests: grep
- 📁 Files: 0
- 🔁 Next prompts: none
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
