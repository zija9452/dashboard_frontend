---
id: 26
title: Second payment on same order
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "payment-proofs", "explainer"]
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

ekc customized me number payment ka , agr isi order ki bd me ek or payment slip aye gi to ?? to kia jhoga

## Response snapshot

Every online payment gets its own proof row, so a later payment on the same order becomes a new row with the same invoice no and is checked on its own; earlier proofs stay as they are. If the extra slip belongs to the same payment, it is added to that payment (max 3 screenshots). Offered to show "Payment 1 / 2" next to the invoice no.

## Outcome

- ✅ Impact: Flow for many payments on one order explained
- 🧪 Tests: none
- 📁 Files: 0
- 🔁 Next prompts: user decision on payment number label
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
