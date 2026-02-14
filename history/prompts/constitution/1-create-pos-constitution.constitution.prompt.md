---
id: 1
title: "Create POS Constitution"
stage: constitution
date: 2026-02-13
surface: agent
model: claude-haiku-4-5-20251001
feature: "none"
branch: "master"
user: "user"
command: "/sp.constitution"
labels: ["constitution", "setup", "frontend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - ".specify/memory/constitution.md"
tests: []
---

# Create POS Constitution

## User Prompt
```
/sp.constitution

Project summary (short & clear)
Build a production-ready frontend for an existing Python FastAPI + Neon Neon backend. Frontend must be a modern, TypeScript-based, responsive POS/admin app using Next.js (v16+), Tailwind CSS, and TypeScript. Use Better-Auth integration to consume backend session-cookie auth endpoints (do not change backend — read Future_Frontend_API/* .md for endpoints).

Core goals (one-liners)

* Exact, advanced "regal POS" dashboard UI (yellow / white / black theme).
* Full feature parity with backend endpoints in `Future_Frontend_API/` (administrativeapi.md, productapi.md, customer_invoice_api.md, vendorapi.md, salesmanapi.md, stckapi.md, walkin_invoiceapi.md, expensesap.md, etc.).
* Robust session-cookie auth handling (login, refresh, logout) via Better-Auth adapter to backend session endpoints.
* Real-world UX: error handling, optimistic updates, validation, accessibility, mobile-first/responsive.

Hard requirements (must)

1. Tech & infra

   * Next.js 16+ (app router), TypeScript, Tailwind CSS, React 18+.
   * Project-level Tailwind theme config with brand palette: yellow (primary), white (bg), black (accent). Provide CSS tokens + tailwind theme extension.
2. Auth

   * Use Better-Auth frontend adapter to call backend session-cookie endpoints (use the exact endpoints from `Future_Frontend_API/*` docs). No client-side token storage beyond in-memory/session cookies; follow backend session semantics.
   * Implement automatic session validation on route change and server-side (SSR) checks for protected pages.
3. API surface

   * Build a typed service layer (`/lib/api/*`) that automatically maps to each MD endpoint file. Generate TypeScript request/response types from the md API specs (strict typing).
   * Centralized error handler and retry policy for network failures.
4. UI/Features (tabs/pages)

   * Dashboard — KPI cards, sales chart, quick actions.
   * Administration — CRUD (add/update/delete/search) using endpoints in `Future_Frontend_API/administrativeapi.md`.
   * Products — full CRUD + search (use productapi.md).
   * Customers — add/update/delete/view + payments, partial payments, partial payment history (use customer_invoice_api.md).
   * Vendors — add/update/delete (vendorapi.md).
   * Salesman — add/update/delete/view (salesmanapi.md).
   * Stock — stock list, add stock (on add: call ZPL barcode API to get ZPL, render for preview, and support printing). Provide search by name & barcode, adjust stock actions, stock report (stckapi.md).
   * Expenses — add/update/delete (expensesap.md).
   * Custom Invoice — create/save via `savescustomerinvoice` endpoint (customer_invoice_api.md); UI must validate JSON payloads per API spec.
   * View Custom Order — show invoices, delete & update actions.
   * Invoice (Walk-in) — create walkin_invoice (walkin_invoiceapi.md).
   * Sales View — date-wise reports for walkin_invoice & customer invoices.
   * Duplicate Bill — show generated bills by order id (both invoice types).
   * Refund — refund walkin_invoices by order id (walkin_invoiceapi.md).
   * Logout — call backend logout session endpoint and clear client state.
5. Printing & ZPL

   * When API returns a ZPL string, render a WYSIWYG preview and provide two printing flows:
     a. WebUSB / Web Serial (preferred) direct-to-USB label printers (provide fallback detection + user instructions).
     b. Server-print proxy fallback: send ZPL to backend print endpoint which prints via server-attached USB.
   * Provide "Export ZPL" and "Copy to Clipboard" options.
6. UX / UI

   * Regal POS visual language: large cards, serif headings optional, compact dense tables for POS screens. Produce a reusable component library (Buttons, Forms, DataTable, Modal, Drawer, BarcodePreview, PrintControls).
   * Accessibility: keyboard navigation, ARIA, contrast checks.
   * Mobile & tablet responsive; POS screens optimized for tablets.
7. Code quality & tooling

   * Strict TypeScript (`strict: true`), ESLint, Prettier, Tailwind JIT, Playwright e2e tests for main flows, unit tests for critical components.
   * Dockerized dev script and `README` with run/test/build instructions, example env vars and how to point to backend.
   * Provide a migration README for switching backend base URL.

Deliverables (what Claude Code CLI must produce)

* Full repo skeleton with `app/` pages for each tab, reusable component library, `/lib/api/*` typed services, `/styles/theme.ts` (Tailwind extension), `README.md`.
* Example pages with sample data wired to the real endpoints (using the Future_Frontend_API docs).
* Auth adapter implementation showing session-cookie usage and server-side protected route examples.
* ZPL preview component and printing helper with WebUSB + server-proxy fallback example + user instructions modal.
* E2E test suite (Playwright) covering: login, create product, create customer invoice, print ZPL, refund flow.
* Acceptance tests (checklist) and mock fixtures.

Success criteria (clear, testable)

* App builds and runs (dev & prod).
* All CRUD flows for Products/Customers/Vendors/Stock/Admin/Salesman pass e2e tests using provided backend endpoints.
* ZPL preview renders correctly and WebUSB print path documented and demoable in modern Chromium.
* Session-based login/logout works server-side and client-side; protected routes redirect to login if session invalid.
* Colors match yellow/white/black brand tokens and UI resembles a regal POS dashboard (screenshots required).

Constraints & notes for implementer

* Do not change backend. Consume the exact endpoints & request/response shapes from `Future_Frontend_API/*.md`. If any endpoint is missing or ambiguous, implement a mocked fallback but mark it clearly in `README`.
* Keep all secrets out of repo; provide `.env.example`.
* Keep prompt output concise: generate code + a short `IMPLEMENTATION.md` explaining design decisions.

Output format (what Claude must return)

1. A ZIP-able repo tree (or create files) ready to run.
2. `IMPLEMENTATION.md` (1 page) summarizing architecture, auth flow, printing approach, and how each MD endp
```

## Assistant Response
Created the project constitution file at `.specify/memory/constitution.md` with the following key principles:
- Production-Ready Frontend Architecture (Next.js 16+, TypeScript, Tailwind CSS)
- Backend Integration Fidelity (exact adherence to existing backend endpoints)
- Session-Based Authentication (Better-Auth integration with session cookies)
- Type-Safe API Layer (typed services with centralized error handling)
- Regal POS Visual Identity (yellow/white/black theme)
- Comprehensive Feature Coverage (full CRUD operations)

The constitution includes governance rules, code quality standards, development workflow guidelines, and security requirements specific to the POS frontend project.

## Outcome
Project constitution successfully created with all required principles and governance structures.

## Evaluation
The constitution aligns with the project requirements and establishes clear principles for the POS frontend development.