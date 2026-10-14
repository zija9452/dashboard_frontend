---
id: 50
title: Disable walk-in Add button without product
stage: general
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: none
branch: none
user: zijayaseen15
command: none
labels: ["walkin-invoice", "ui", "validation"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/app/(invoices)/walkin-invoice/page.tsx
tests:
 - none (not run)
---

## Prompt

explore my whole project and is me walkin -invoice page pr jb product add nhi he orm me to add ka button disable q nhi he ??

is me bhi add kro

## Response snapshot

The Add button on the walk-in invoice page had no `disabled` prop; validation only ran inside addToCart() with a toast. Added `disabled={!selectedProduct}` plus `disabled:opacity-50 disabled:cursor-not-allowed`, matching the Payment button.

## Outcome

- ✅ Impact: Add stays disabled until a product is picked from suggestions
- 🧪 Tests: not run; check in browser
- 📁 Files: walkin-invoice/page.tsx
- 🔁 Next prompts: deploy and check
- 🧠 Reflection: typing in the search box resets selectedProduct, so the button disables again on edit

## Evaluation notes (flywheel)

- Failure modes observed: none
- Next experiment: none
