---
id: 3
title: "Create Tasks Document"
stage: tasks
date: 2026-02-13
surface: agent
model: claude-haiku-4-5-20251001
feature: "001-nextjs-pos-frontend"
branch: "001-nextjs-pos-frontend"
user: "user"
command: "/sp.tasks"
labels: ["tasks", "frontend", "pos", "implementation"]
links:
  spec: "specs/001-nextjs-pos-frontend/spec.md"
  plan: "specs/001-nextjs-pos-frontend/plan.md"
  tasks: "specs/001-nextjs-pos-frontend/tasks.md"
  ticket: null
  adr: null
  pr: null
files:
  - "specs/001-nextjs-pos-frontend/tasks.md"
tests: []
---

# Create Tasks Document

## User Prompt
```
/sp.tasks

Purpose (one line)
Concrete, runnable task list Claude Code CLI should execute to scaffold, implement, and validate the Next.js + Tailwind + TypeScript frontend that consumes the existing FastAPI + Neon backend, uses session-cookie auth (Better-Auth), and supports ZPL printing for Zebra label printers.

Tech stack (single inline list — each entity shown once)
FastAPI, Neon, Next.js, Tailwind CSS, TypeScript, Better-Auth, Zebra Technologies, Playwright, Docker

# Tasks (grouped by phase)

## Phase A — Foundation (high priority)

1. **Scaffold repo & toolchain**

   * Action: Create Next.js (app router) + TypeScript project, Tailwind config, ESLint, Prettier, `pnpm` scripts, `Dockerfile` + `docker-compose.dev.yml`.
   * Output: repo skeleton, `package.json`, `tailwind.config.ts`, `.eslintrc`, `.prettierrc`.
   * Acceptance: `pnpm dev` runs, TypeScript compiles `--noEmit` cleanly for scaffold files.

2. **Theme & global layout**

   * Action: Add `styles/theme.ts` with yellow/white/black tokens, extend Tailwind theme, global layout with top nav and side nav.
   * Output: `styles/theme.ts`, `app/layout.tsx`, sample pages.
   * Acceptance: theme tokens imported and applied; basic pages show brand palette.

3. **API spec ingestion + CLARIFY_LOG**

   * Action: Parse `Future_Frontend_API/*.md`, auto-generate `lib/api/` stubs and a `CLARIFY_LOG.md` listing missing/ambiguous items.
   * Output: `lib/api/generated/*` with `/* REVIEW */` flags, `CLARIFY_LOG.md`.
   * Acceptance: All endpoints listed, missing items flagged.

4. **Auth adapter stub (Better-Auth session-cookie)**

   * Action: Implement `auth/adapter.ts` with login/logout/session-validate wrappers; provide `withSessionSSR` and `useSession()` hook scaffold.
   * Output: `auth/adapter.ts`, example protected route.
   * Acceptance: Login page calls stub endpoint; `withSessionSSR` redirect example present.

## Phase B — Core CRUD (medium-high)

5. **Component library & forms**

   * Action: Build `components/ui/` (Button, Input, Modal, DataTable, Form hooks).
   * Output: Reusable components with PropTypes/TS interfaces.
   * Acceptance: Components used in at least one CRUD page.

6. **Products CRUD**

   * Action: Implement list, create, update, delete, search pages using `Future_Frontend_API/productapi.md` endpoints.
   * Output: `app/products/*` pages, typed service `lib/api/products.ts`.
   * Acceptance: Create/update/delete flow completes and shows updated list (mock if backend missing).

7. **Administration CRUD**

   * Action: Admin pages wired to `administrativeapi.md`.
   * Output: `app/admin/*` with search & role UI.
   * Acceptance: Admin CRUD forms validate and call API.

8. **Vendors & Salesman CRUD**

   * Action: Implement `app/vendors/*`, `app/salesman/*` using respective md endpoints.
   * Acceptance: List and forms exist and use typed API clients.

9. **Customers (incl. partial payments UI)**

   * Action: Customer list, customer detail, payment modal supporting partial payments and history using `customer_invoice_api.md`.
   * Output: `app/customers/*`, payment UI.
   * Acceptance: Partial payment flow simulates allocation and shows history.

## Phase C — Stock, ZPL & Printing (high)

10. **Stock pages & search**

    * Action: Stock list, add stock form, adjust stock buttons, search by name/barcode (use `stckapi.md`).
    * Output: `app/stock/*`.
    * Acceptance: Add stock triggers ZPL generation call (mocked if necessary).

11. **ZPL preview & renderer**

    * Action: Implement `components/BarcodePreview` that converts ZPL to canvas preview and shows raw ZPL.
    * Output: `utils/zplRenderer.ts`, `components/BarcodePreview.tsx`.
    * Acceptance: Example ZPL renders sample preview.

12. **WebUSB print helper + server-proxy fallback**

    * Action: Implement `utils/print/webusb.ts` (requestDevice flow) and `utils/print/serverProxy.ts` (POST ZPL to backend). Provide UI controls: Print (WebUSB), Send to Server, Export ZPL, Copy.
    * Output: `utils/print/*`, `components/PrintControls.tsx`.
    * Acceptance: WebUSB attempt invoked (mock in CI); server-proxy fallback documented and callable.

13. **USB instructions modal & troubleshooting**

    * Action: Create onboarding modal explaining pairing, permissions, and drivers.
    * Acceptance: Modal accessible from stock add page.

## Phase D — Invoices, Sales View & Refunds (medium)

14. **Custom Invoice & Walk-in Invoice**

    * Action: Build create invoice UI (validate JSON schema per `customer_invoice_api.md`), walkin invoice flow per `walkin_invoiceapi.md`.
    * Output: `app/invoices/create.tsx`, `app/invoices/walkin.tsx`.
    * Acceptance: Submit creates order id (mock/full), Duplicate Bill page can display.

15. **View Custom Order & Duplicate Bill**

    * Action: Order detail page showing invoice data, edit/delete actions, printable bill view.
    * Acceptance: Duplicate Bill displays formatted bill for given order id.

16. **Refund flow**

    * Action: Refund UI that calls refund endpoint (walkin_invoice_api.md) with validations and updates UI totals.
    * Acceptance: Refund result reflected in Sales View.

17. **Sales View & Reports**

    * Action: Date-range reports for walkin and customer invoices; export CSV/PDF options (client-side).
    * Acceptance: Reports filter by date and show totals.

## Phase E — Tests, QA & CI (high)

18. **Typegen & strict typing enforcement**

    * Action: Ensure `tsconfig strict: true`, run `tsc` in CI. Replace `any` in `lib/api` where possible.
    * Acceptance: `tsc --noEmit` passes.

19. **Unit tests for api/auth/zpl logic**

    * Action: Add Vitest/Jest tests for `lib/api/*`, `auth/adapter`, `zplRenderer`.
    * Acceptance: Tests pass locally; critical modules >=80% coverage.

20. **Playwright E2E tests**

    * Action: Create Playwright tests for login, create product, create invoice, print (WebUSB mocked), refund.
    * Output: `tests/playwright/*`.
    * Acceptance: Playwright suite runnable in CI with WebUSB mocked.

21. **Accessibility & lint checks**

    * Action: Axe checks for Dashboard & POS pages; ESLint rules enforced in CI.
    * Acceptance: No critical a11y failures; linter passes.

## Phase F — Docs, Handoff & Extras (medium)

22. **IMPLEMENTATION.md & ACCEPTANCE.md**

    * Action: Produce 1-page architecture + auth flow doc and acceptance checklist.
    * Acceptance: Docs present and map endpoints → files.

23. **.env.example & README**

    * Action: Provide `DATABASE_URL` placeholder, `NEXT_PUBLIC_API_BASE`, `PRINT_PROXY_URL`, instructions to run dev / docker / tests.
    * Acceptance: Developer can follow README to start app.

24. **Mock adapters & final CLARIFY_LOG**

    * Action: Place mock implementations in `mocks/` for any missing endpoints and finalize `CLARIFY_LOG.md` with HIGH priority items flagged.
    * Acceptance: All unresolved items documented with recommended defaults.

# Cross-cutting tasks (apply to all phases)

* **Global error handling & toasts** — central fetch wrapper with retry policy for idempotent requests.
* **Optimistic updates & stale-while-revalidate** — for product lists and stock adjustments.
* **Role-based UI flags** — feature-visibility driven by session role.
* **Secrets safety** — `.env.example` only; `.gitignore` for `.env` and sensitive files.

# Output files & markers the CLI must produce per task

* For each generated file that uses inferred/mocked API shapes: add `/* REVIEW */` header comment.
* Create `CLARIFY_LOG.md` with item status: `FOUND @ file:line` or `MISSING - DEFAULT USED`.
* Create `TODO_HIGH_SECURITY.md` for any missing cookie/CORS/payment rules (must be addressed before production).

# How to run from Claude Code CLI (suggested flags)

* `--md-dir Future_Frontend_API/ --output ./frontend-scaffold --generate-api-types --zpl-preview --webusb-first --auth better-auth:session-cookie`

---

Use this `/sp.tasks` prompt in Claude Code CLI so the generator executes the tasks above in order, creates the required files, and leaves clearly-marked review points for any missing backend details.
```

## Assistant Response
Created comprehensive tasks document for the Next.js POS frontend project. The tasks.md file includes:

1. **Phase 1: Setup** - Project initialization with Next.js, TypeScript, Tailwind CSS, and toolchain
2. **Phase 2: Foundational** - Core infrastructure including authentication, API layer, and components
3. **Phase 3: US1 - Authenticate and Access Dashboard** - Authentication and dashboard functionality (P1 priority)
4. **Phase 4: US2 - Manage Products** - Product CRUD operations (P1 priority)
5. **Phase 5: US3 - Process Customer Invoices** - Invoice creation and management (P1 priority)
6. **Phase 6: US4 - Handle ZPL Label Printing** - ZPL preview and printing functionality (P2 priority)
7. **Phase 7: US5 - Manage Stock Levels** - Stock management functionality (P2 priority)
8. **Phase 8: US6 - Process Walk-in Sales** - Walk-in invoice functionality (P2 priority)
9. **Phase 9: US7 - View Sales Reports** - Reporting functionality (P3 priority)
10. **Phase 10-13: Additional features** - Administration, invoicing, testing, and documentation

The tasks follow the required format with checkboxes, sequential IDs, story labels where appropriate, and clear descriptions with file paths. Each user story phase includes specific acceptance criteria mapped from the original specification. Dependencies between phases are clearly identified, and opportunities for parallel execution are noted.

## Outcome
Complete tasks document created with 133 specific, actionable tasks organized by priority and user story, ready for implementation by the Claude Code CLI.

## Evaluation
The tasks document provides a comprehensive roadmap for implementing the POS frontend, with clear organization by user story priority and specific, actionable tasks that follow the required format.