---
id: 4
title: Clearer flat charges message in demo
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["quotation", "teams", "flat-charges", "demo"]
links:
  spec: null
  ticket: null
  adr: null
  pr: https://claude.ai/artifact/5yeas9HeXqhBMSPLmqVvBE
files:
 - (artifact only, no project files changed)
tests:
 - headless Edge check of totals, tier card and form message text
---

## Prompt

to city warriors wale me flat charges lgne chahiye hen na , 3 pcs hen us me 5 or 5 se zyda nhi he

## Response snapshot

Checked the demo headless: City Warriors FC (3 T-shirts) already had Rs. 500 flat charges in the totals. The confusing text came from the form message, which talked about the 2 pre-filled Full-sleeve T-shirts (3 + 2 = 5). The message now says the current pieces and charge first, then what happens after adding. The demo now starts with the quantity empty.

## Outcome

- ✅ Impact: Demo no longer reads as if City Warriors has no flat charges
- 🧪 Tests: headless check showed both teams' Rs. 500 T-shirt flat charges
- 📁 Files: none in project
- 🔁 Next prompts: rate tier rule, Customer Order team display, Customer Invoice scope
- 🧠 Reflection: Preview text about a future state must state the current state first

## Evaluation notes (flywheel)

- Failure modes observed: misleading preview copy
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
