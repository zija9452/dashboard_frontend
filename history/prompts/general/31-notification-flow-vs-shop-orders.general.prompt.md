---
id: 31
title: Notification flow vs shop orders
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["payments", "notifications", "firestore", "explainer"]
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

local pr foran nhi ati notification , lekin google cloud console pr ati he , aesa hi he na ?? jese shop orders me logic he ?? same flow he ? yes or no , check kr k confirm kro

## Response snapshot

No, it is not the same flow. Shop orders work this way:
- the backend calls `publish_signal` (Firestore `signals` doc, per branch);
- the badge listens with `onSnapshot`, so it is instant on cloud and has a 15-minute poll as fallback;
- locally there are no Firestore creds, so it is not instant.

The Payments Record badge (CashDepositBadge) has no Firestore signal and no poll. It loads once and refreshes only on same-tab events, so it is not instant on cloud either.

Offered to add the same flow:
- `publish_signal("payments_record")` on deposit and proof create / upload / approve / reject;
- an `onSnapshot` listener in the badge, plus the 15-minute poll.

Firestore rules already allow reading any signals doc.

## Outcome

- ✅ Impact: Accurate answer, with a fix offered
- 🧪 Tests: none
- 📁 Files: 0
- 🔁 Next prompts: implement Firestore signal for Payments Record
- 🧠 Reflection: none

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
