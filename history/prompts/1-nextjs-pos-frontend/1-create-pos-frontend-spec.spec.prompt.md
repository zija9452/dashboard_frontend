---
id: 1
title: "Create POS Frontend Spec"
stage: spec
date: 2026-02-13
surface: agent
model: claude-haiku-4-5-20251001
feature: "1-nextjs-pos-frontend"
branch: "1-nextjs-pos-frontend"
user: "user"
command: "/sp.specify"
labels: ["spec", "frontend", "pos", "authentication"]
links:
  spec: "specs/1-nextjs-pos-frontend/spec.md"
  ticket: null
  adr: null
  pr: null
files:
  - "specs/1-nextjs-pos-frontend/spec.md"
  - "specs/1-nextjs-pos-frontend/checklists/requirements.md"
tests: []
---

# Create POS Frontend Spec

## User Prompt
```
/sp.specify

Purpose (one line)
A precise, machine-actionable specification for Claude Code CLI to scaffold a production Next.js (app router) + Tailwind + TypeScript frontend that consumes the existing Python FastAPI + Neon Neon backend (use `Future_Frontend_API/*.md` for exact endpoints). Use Better-Auth session-cookie flows and deliver a regal POS UI (yellow / white / black).

Tech stack (for codegen — highlight once)

* Next.js (v16+, app router)
* Tailwind CSS
* TypeScript
* Better-Auth
* Playwright (for E2E)
* Docker (dev scripts)
* Zebra Technologies (ZPL target)

Scope (explicit)

* Build pages/tabs: Dashboard, Administration, Products, Customers, Vendors, Salesman, Stock (ZPL + print), Expenses, Custom Invoice, View Custom Order, Invoice (walk-in), Sales View (date reports), Duplicate Bill, Refund, Logout.
* Implement typed `/lib/api/*` services mapped 1:1 to `Future_Frontend_API/*.md`.
* Implement Better-Auth adapter to consume backend session-cookie endpoints (server-side and client-side checks).
* ZPL preview + WebUSB / server-proxy print flows.
* Component library, strict TypeScript, tests, docs.

Success criteria (measurable)

* Type-safe API layer: TypeScript request/response types for every endpoint in `Future_Frontend_API` (no `any` in API surface).
* End-to-end flows for: login/logout, create/update/delete product, create customer invoice, print ZPL, refund — covered by Playwright tests.
* Protected routes redirect to login on invalid session (SSR + client checks).
* ZPL preview: returned ZPL renders in preview and offers WebUSB print attempt + server-proxy fallback.
* UI uses brand palette (yellow/white/black) and follows "regal POS" layout across desktop/tablet.
* README with envs, run/test/build, and mapping notes for each `Future_Frontend_API/*.md` file.

Constraints & non-functional requirements

* TypeScript `strict: true`; ESLint + Prettier enforced.
* No credentials or secrets in repo; include `.env.example`.
* Accessibility: basic ARIA + keyboard navigation on main flows.
* Network error handling: global handler with retries (idempotent only) and user-visible toasts.
* Use minimal runtime client storage — rely on backend session cookies (do not persist tokens in localStorage).
* All API calls must use the exact request shapes from `Future_Frontend_API` docs; where ambiguous, generate a clearly-flagged mock adapter.

Not building (explicit)

* No vendor/product comparison, no payment gateway integration beyond backend endpoints, no rewriting backend.
* No support for non-Chromium printers via WebUSB unless user supplies drivers; provide fallback only.

Deliverables (what Claude Code CLI should output)

1. Repo skeleton with:

   * `app/` routes for each tab + protected route examples.
   * `components/ui` reusable component library (Button, Form, DataTable, Modal, Drawer, KPI, Chart wrapper, BarcodePreview, PrintControls).
   * `lib/api/*` typed services auto-generated from MD specs (requests & responses).
   * `styles/theme.ts` + `tailwind.config.ts` with yellow/white/black tokens.
   * `auth/` adapter implementing Better-Auth session-cookie flows (client + server checks).
   * `utils/print` with WebUSB attempts and server-proxy code examples.
   * `tests/playwright/*` E2E tests (login, create product, invoice, print, refund).
   * `Dockerfile`, `docker-compose.dev.yml`, `.env.example`, `README.md`, `IMPLEMENTATION.md`, `ACCEPTANCE.md`.
2. `IMPLEMENTATION.md` (1 page): architecture, auth flow diagram, ZPL & printing approach, mapping table: `Future_Frontend_API/*.md` → `lib/api/*`.
3. `ACCEPTANCE.md` checklist with exact test steps and expected responses.

API mapping & typing rules (strict)

* Parse each `Future_Frontend_API/*.md` and generate a TypeScript interface per endpoint: `{ method, path, requestSchema, responseSchema }`.
* Output example client helpers: `api.getProducts(params): Promise<GetProductsResponse>` etc.
* If MD endpoint lacks JSON schema, infer types from examples and add a `/* REVIEW: inferred type */` comment.

Auth & session handling (explicit)

* Implement Better-Auth adapter that:

  * Calls backend login endpoint (from MD) and relies on HTTP-only session cookie set by backend.
  * Provides `withSessionSSR` server-side wrapper for protected pages (redirects to `/login` if no session).
  * Exposes `useSession()` React hook (client) with in-memory caching and background refresh via a "/auth/validate-session" endpoint.
  * Logout calls backend logout endpoint and clears client state.

ZPL & printing spec

* When `stckapi` or invoice endpoints return a ZPL string:

  * Render a preview canvas showing approximate label layout (convert ZPL to canvas render).
  * Offer: `Print (WebUSB)`, `Send to Server for Print`, `Export ZPL`, `Copy ZPL`.
  * WebUSB flow: attempt navigator.usb.requestDevice filter for common label printers; if denied/unavailable, show modal with fallback instructions and "Send to Server" button.
  * Provide clear user instructions for first-time printer pairing and troubleshooting.

Testing & QA

* Unit tests (Vitest/Jest) for API layer, auth adapter, ZPL preview logic.
* Playwright E2E tests for login, CRUD, invoice creation, print attempt (mock WebUSB in CI), refund.
* Accessibility smoke tests (axe-core) on Dashboard & Checkout pages.

Acceptance tests (step-by-step — to put in `ACCEPTANCE.md`)

1. Dev build and run: `pnpm dev` (or `docker-compose.dev up`) — app loads, login page appears.
2. Login with test account from backend MD: session cookie set; visiting `/dashboard` shows KPI cards.
3. Create Product: fill form → API returns 201 → product appears in list (Playwright assertion).
4. Create Customer Invoice: follow UI JSON rules → API returns order id → Duplicate Bill page shows printable bill.
5. Print ZPL: create stock label → API returns ZPL → preview renders → WebUSB attempt called (mocked in CI) → server-proxy fallback available.
6. Refund flow: refund walkin_invoice by order id → API returns success → Sales View shows corrected totals.
7. Logout: endpoint called and redirect to `/login`.

Risk & mitigation

* Missing/ambiguous MD endpoints → generate mock adapter + flag TODO in `IMPLEMENTATION.md`.
* WebUSB browser support limited → provide server-proxy print flow and extensive user instructions.
* Session semantics mismatch → implement robust session-validate endpoint and defensive redirects.

Suggested milestones (example schedule — editable)

* MVP (auth, dashboard, products list + CRUD): milestone 1.
* Core features (customers, invoices, stock + ZPL preview): milestone 2.
* Extras (printing fallbacks, sales reports, refunds, tests, docs): milestone 3.

CLI usage hints (for Claude Code CLI)

* `--md-dir Future_Frontend_API/` (source for endpoint docs)
* `--theme yellow-white-black`
* `--auth better-auth:session-cookie`
* `--generate-api-types`
* `--include-playwright`
* `--zpl-preview`

Output format required from Claude Code CLI (concise)

* Full repo tree (files created) + `IMPLEMENTATION.md` + `ACCEPTANCE.md` + initial Playwright test run results (or test stubs). Mark any mocked endpoints clearly.
```

## Assistant Response
Created a comprehensive feature specification for the Next.js POS frontend project with the following key elements:

User Stories:
- Authentication and dashboard access (P1)
- Product management (P1)
- Customer invoice processing (P1)
- ZPL label printing (P2)
- Stock management (P2)
- Walk-in sales processing (P2)
- Sales reporting (P3)

Functional Requirements:
- Better-Auth session-cookie integration
- Type-safe API services mapped to backend specifications
- ZPL preview and printing with fallback options
- Responsive UI with yellow/white/black brand palette
- Comprehensive CRUD operations for all entity types
- Proper error handling and accessibility features

Success Criteria:
- Measurable outcomes for performance, reliability, and user experience
- Test coverage requirements
- Accessibility compliance
- Build and deployment success metrics

The specification includes acceptance scenarios for each user story and identifies potential edge cases to consider during implementation.

## Outcome
Feature specification successfully created with clear user scenarios, functional requirements, and measurable success criteria.

## Evaluation
The specification aligns with the project requirements and provides sufficient detail for planning and implementation while maintaining focus on user value.