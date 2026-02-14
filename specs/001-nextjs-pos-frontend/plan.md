# Implementation Plan: Next.js POS Frontend

**Branch**: `001-nextjs-pos-frontend` | **Date**: 2026-02-13 | **Spec**: [link to spec.md]
**Input**: Feature specification from `/specs/001-nextjs-pos-frontend/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Production-grade Next.js frontend consuming existing Python FastAPI + Neon backend with session-cookie authentication and regal POS UI featuring yellow/white/black theme. Implements full CRUD operations for all business entities (products, customers, vendors, salesmen, stock, invoices) with ZPL printing support for barcode labels. Built with TypeScript, Tailwind CSS, and Better-Auth integration following the Regal POS constitution principles.

## Technical Context

**Language/Version**: TypeScript 5.3+, Next.js 16+ (App Router), React 18+
**Primary Dependencies**: Next.js, Tailwind CSS, Better-Auth, Zebra Technologies (ZPL), Playwright, Docker
**Storage**: Backend Neon Postgres database (via FastAPI endpoints), client-side session cookies
**Testing**: Playwright (E2E), Jest/Vitest (Unit), axe-core (Accessibility)
**Target Platform**: Web application (desktop/tablet/mobile responsive), modern browsers with WebUSB support
**Project Type**: Web frontend consuming backend API
**Performance Goals**: <10s login to dashboard, <2s ZPL preview render, 99% API success rate under normal conditions
**Constraints**: Strict TypeScript (strict: true), WCAG 2.1 AA accessibility compliance, yellow/white/black brand identity, session-cookie only (no local token storage)
**Scale/Scope**: POS system for retail environments, multi-role support (admin/cashier/employee), concurrent user sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Production-Ready Frontend Architecture**: Confirmed - Next.js 16+ with App Router, TypeScript strict mode, Tailwind CSS
- **Backend Integration Fidelity**: Confirmed - Exact adherence to FastAPI endpoints in Future_Frontend_API/*.md, no backend changes
- **Session-Based Authentication**: Confirmed - Better-Auth with session-cookie integration, no client-side token storage beyond in-memory
- **Type-Safe API Layer**: Confirmed - Strict TypeScript with generated request/response types from API docs
- **Regal POS Visual Identity**: Confirmed - Yellow/white/black theme implementation planned
- **Comprehensive Feature Coverage**: Confirmed - All CRUD operations for business entities as specified

## Project Structure

### Documentation (this feature)

```text
specs/001-nextjs-pos-frontend/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
├── IMPLEMENTATION_DECISIONS.md  # From clarification phase
├── CLARIFY_LOG.md       # From clarification phase
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
frontend/
├── app/                 # Next.js app router pages
│   ├── (auth)/          # Authentication pages (login, register)
│   │   └── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── admin/page.tsx
│   ├── products/page.tsx
│   ├── customers/page.tsx
│   ├── vendors/page.tsx
│   ├── salesman/page.tsx
│   ├── stock/page.tsx
│   ├── expenses/page.tsx
│   ├── invoices/
│   │   ├── custom/page.tsx
│   │   ├── walkin/page.tsx
│   │   └── view/page.tsx
│   ├── sales-view/page.tsx
│   ├── duplicate-bill/page.tsx
│   ├── refund/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Form.tsx
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── KPI.tsx
│   │   ├── ChartWrapper.tsx
│   │   ├── BarcodePreview.tsx
│   │   └── PrintControls.tsx
│   └── layout/          # Layout components
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── ProtectedRoute.tsx
├── lib/
│   ├── api/             # Typed API services from Future_Frontend_API/*.md
│   │   ├── products.ts
│   │   ├── customers.ts
│   │   ├── vendors.ts
│   │   ├── salesman.ts
│   │   ├── stock.ts
│   │   ├── invoices.ts
│   │   ├── auth.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── fetch-wrapper.ts
│   │   └── helpers.ts
│   └── types/
│       ├── api.d.ts
│       └── globals.d.ts
├── auth/                # Better-Auth integration
│   ├── adapter.ts
│   ├── session-provider.tsx
│   ├── hooks.ts
│   └── middleware.ts
├── utils/
│   └── print/           # ZPL printing utilities
│       ├── zpl-renderer.ts
│       ├── webusb-handler.ts
│       ├── server-proxy.ts
│       └── types.ts
├── styles/
│   ├── globals.css      # Tailwind base styles
│   └── theme.ts         # Yellow/white/black theme extension
├── public/
│   ├── icons/
│   └── images/
├── tests/
│   ├── playwright/
│   │   ├── auth.spec.ts
│   │   ├── products.spec.ts
│   │   ├── invoices.spec.ts
│   │   ├── print.spec.ts
│   │   └── refund.spec.ts
│   └── unit/
│       ├── api/
│       ├── auth/
│       └── print/
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── README.md
├── IMPLEMENTATION.md
├── ACCEPTANCE.md
├── Dockerfile
└── docker-compose.dev.yml
```

**Structure Decision**: Web application frontend consuming backend API. The frontend directory contains all Next.js application code with proper separation of concerns: app directory for pages and routing, components for reusable UI elements, lib for API services and utilities, auth for session management, and utils for specialized functions like printing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
