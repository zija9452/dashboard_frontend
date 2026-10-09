---
id: 5
title: Remove team dropdown from demo
stage: general
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["quotation", "teams", "demo"]
links:
  spec: null
  ticket: null
  adr: null
  pr: https://claude.ai/artifact/5yeas9HeXqhBMSPLmqVvBE
files:
 - (artifact only, no project files changed)
tests:
 - headless Edge check: team name shows, flat charges unchanged
---

## Prompt

or royal me nhi lgen ge , qk us me 8 hen

nhi nhi , wo 3 shoirt hen to lgen ge hi , 6 to short hen naa , wo ok hen , lekin phr dropdown na aye team name me

## Response snapshot

Kept the flat charge rule per team + category (Royal FC: 2 T-shirts get flat charges, 6 Shorts do not). Removed the Team dropdown from Add Item; it now shows "Adding to team: <name>" as text, and team is changed only with the tabs.

## Outcome

- ✅ Impact: Team picked only from tabs, less UI on the form
- 🧪 Tests: headless check passed
- 📁 Files: none in project
- 🔁 Next prompts: rate tier rule, Customer Order team display, Customer Invoice scope
- 🧠 Reflection: First message was later reversed by the user; rule unchanged

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
