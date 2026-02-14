---
id: 2
title: "Create Planning Docs"
stage: plan
date: 2026-02-13
surface: agent
model: claude-haiku-4-5-20251001
feature: "001-nextjs-pos-frontend"
branch: "001-nextjs-pos-frontend"
user: "user"
command: "/sp.plan"
labels: ["plan", "frontend", "pos", "architecture"]
links:
  spec: "specs/001-nextjs-pos-frontend/spec.md"
  plan: "specs/001-nextjs-pos-frontend/plan.md"
  ticket: null
  adr: null
  pr: null
files:
  - "specs/001-nextjs-pos-frontend/plan.md"
  - "specs/001-nextjs-pos-frontend/research.md"
  - "specs/001-nextjs-pos-frontend/data-model.md"
  - "specs/001-nextjs-pos-frontend/quickstart.md"
  - "specs/001-nextjs-pos-frontend/contracts/api-contracts.md"
tests: []
---

# Create Planning Docs

## User Prompt
```
/sp.plan

Purpose (one line)
Create a concise, machine-actionable implementation plan Claude Code CLI will follow to scaffold, build, and validate a production-grade Next.js frontend that consumes the existing FastAPI + Neon backend, uses session-cookie auth, and provides a regal POS UI with full ZPL printing support.

Tech stack (for generator)

* FastAPI
* Neon
* Next.js
* Tailwind CSS
* TypeScript
* Better-Auth
* Zebra Technologies
* Playwright
* Docker

1. Architecture sketch (deliverable: `ARCHITECTURE.md`)

* Topology: Next.js (app router) frontend ↔ FastAPI backend (session-cookie auth) ↔ Neon Postgres.
* Layers:

  * Presentation: `app/` routes & pages, theme tokens (yellow/white/black), reusable UI library.
  * API layer: `lib/api/*` typed services auto-generated from `Future_Frontend_API/*.md`.
  * Auth: `auth/` adapter implementing Better-Auth session-cookie flows (with `withSessionSSR` wrapper + `useSession()` hook).
  * Print: `utils/print` handling ZPL → preview canvas + WebUSB + server-proxy fallback.
  * Mocks & clarifications: `mocks/`, `CLARIFY_LOG.md`.
* Dataflow diagrams: login flow, CRUD flow, invoice → ZPL → print flow (include seq diagrams).

2. Section structure (repo & docs)

* `app/` routes for each tab (dashboard, admin, products, customers, vendors, salesman, stock, expenses, invoices, refunds, reports).
* `components/ui/` (Button, Form, DataTable, Modal, Drawer, KPI, Chart, BarcodePreview, PrintControls).
* `lib/api/` (generated typed clients + central fetch wrapper).
* `auth/` (adapter, SSR wrappers, hooks).
* `utils/print` (zplRenderer, webusb, serverProxy).
* `mocks/` and `tests/playwright/`.
* Docs: `README.md`, `IMPLEMENTATION.md`, `ACCEPTANCE.md`, `CLARIFY_LOG.md`, `ARCHITECTURE.md`.

3. Phased plan & milestones (deliverables per phase)

* Phase A — Foundation (MVP scaffold)

  * Repo skeleton, theme, Tailwind setup, global layout, auth adapter stub, `lib/api/` generator run (mark missing endpoints), basic dashboard.
  * Deliver: runnable dev app, `.env.example`, `CLARIFY_LOG.md`.
* Phase B — Core CRUD & API parity

  * Products, Administration, Vendors, Salesman, Customers CRUD wired to typed services.
  * Deliver: forms, lists, validation, Playwright test stubs.
* Phase C — Invoicing & Stock + ZPL

  * Custom invoice flows, walkin invoice, stock add/adjust, ZPL preview + copy/export.
  * Deliver: ZPL preview component, print helper with WebUSB attempt + server-proxy fallback.
* Phase D — Reporting & Refunds

  * Sales view date-range reports, duplicate bill, refund flow, partial payments UI.
  * Deliver: reports, reconciled totals, Playwright tests for refund.
* Phase E — Hardening & QA

  * E2E Playwright tests, unit tests for api layer & zplRenderer, accessibility checks, CI config, Docker dev, docs.
  * Deliver: test passing, `IMPLEMENTATION.md` + `ACCEPTANCE.md`.

4. Decisions needing documentation (each must include options, tradeoffs, recommended choice)

* Auth strategy: rely solely on session-cookie (recommended) vs token-based (tradeoffs: security, SSR complexity).
* ZPL print path: WebUSB-first (user browser support) vs server-proxy-first (reliability). Recommend WebUSB with server-proxy fallback.
* API typing: strict generation from MD (preferred) vs manual loose types (faster). Recommend strict generation + review flags for inferred types.
* State management: server components + lightweight client state (React Context) vs heavy client store (Redux). Recommend minimal client state.
* Print-testing in CI: mock WebUSB (recommended) vs require hardware in CI (impractical). Document mock approach.

5. Testing strategy (validation checks mapped to acceptance criteria)

* Unit tests (Vitest/Jest): api clients, auth adapter behaviors, zplRenderer. Acceptance: no runtime `any` in `lib/api`.
* Playwright E2E: login, create product, create customer invoice, print ZPL (mock WebUSB), refund. Acceptance: steps in `ACCEPTANCE.md` pass.
* Accessibility: axe-core checks for Dashboard & Checkout pages — must pass basic a11y.
* Smoke & integration: protected route SSR checks, session expiry flows.
* CI: run lint, typecheck, unit tests, Playwright (with WebUSB mocked), build.

6. Quality validation & acceptance (what to assert)

* Type safety: `tsc --noEmit` passes.
* Linting: ESLint pass.
* Tests: unit coverage threshold for critical modules (>=80% for api/auth/zpl).
* UX: mobile responsiveness checks for POS screens.
* Print: ZPL preview shows expected label sample (string detection + canvas rendered); WebUSB flow invoked (mock assertion).

7. Risks & mitigations

* Missing/ambiguous API schemas → mitigate: generate mocks + `CLARIFY_LOG.md` + flag TODOs.
* WebUSB browser support → mitigate: server-proxy fallback and clear user instructions modal.
* Session semantics mismatch (CORS/cookie flags) → mitigate: high-priority clarification in `CLARIFY_LOG.md` and protective defaults (do not store tokens client-side).
* Printing hardware inconsistent → mitigate: provide Export/Copy flow + server print example.

8. Outputs Claude Code CLI must produce at each checkpoint

* Phase A: repo scaffold, `CLARIFY_LOG.md`, demo screenshots.
* Phase B: wired CRUD pages + API types with `/* REVIEW */` annotations.
* Phase C: ZPL preview & print helper + print docs.
* Phase D: reports & refund flows.
* Phase E: tests, CI config, `IMPLEMENTATION.md`, `ACCEPTANCE.md`.

9. Acceptance & handoff (final artifacts)

* Working repo: builds and starts with `pnpm dev` and `docker-compose.dev up`.
* Docs: `IMPLEMENTATION.md` (architecture + auth flow + print approach), `ACCEPTANCE.md` (test steps).
* Tests: Playwright E2E suite passing in CI with WebUSB mocked.
* `CLARIFY_LOG.md` enumerating remaining TODOs and their priority.

10. CLI operational rules & flags (how Claude Code CLI should run)

* `--md-dir Future_Frontend_API/` (source spec).
* `--generate-api-types --strict-typing` (enforce types).
* `--zpl-preview --webusb-first` (print behavior).
* `--output ./scaffold` (target directory).
* On ambiguous items: auto-generate mocks, annotate with `/* REVIEW */` and add to `CLARIFY_LOG.md` (do not
```

## Assistant Response
Created comprehensive planning documentation for the Next.js POS frontend project:

1. **Implementation Plan** (plan.md): Detailed architecture plan with technology stack, project structure, and constitutional compliance
2. **Research Summary** (research.md): Consolidated findings from API documentation review with technical decisions
3. **Data Model** (data-model.md): Defined core entities and relationships based on backend API contracts
4. **Quick Start Guide** (quickstart.md): Step-by-step setup and development workflow instructions
5. **API Contracts** (contracts/api-contracts.md): Detailed API endpoints and contracts based on documentation

The planning documents establish a solid foundation for the Next.js POS frontend development, with clear architecture, data models, and implementation approach aligned with the backend API specifications. All constitutional requirements are addressed, and the phased approach ensures systematic development of all required features.

## Outcome
Planning phase completed successfully with all required documentation created to guide the implementation of the Next.js POS frontend.

## Evaluation
The planning documents provide comprehensive guidance for implementation while maintaining alignment with backend API specifications and constitutional principles.