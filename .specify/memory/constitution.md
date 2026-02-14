<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.0.0 (initial version)
- Modified principles: All principles added with POS frontend project specifics
- Added sections: Code Quality, Development Workflow, Security & Auth
- Removed sections: None
- Templates requiring updates: ✅ Updated all relevant templates
- Follow-up TODOs: None
-->
# Regal POS Frontend Constitution

## Core Principles

### I. Production-Ready Frontend Architecture
Modern, responsive POS application using Next.js 16+ (app router), TypeScript (strict mode), and Tailwind CSS. All code must follow strict typing, be well-documented, and maintain high performance standards for retail environments.

### II. Backend Integration Fidelity
Exact adherence to existing Python FastAPI + Neon backend endpoints as documented in Future_Frontend_API/*.md files. No backend modifications allowed; implement fallbacks for missing/ambiguous endpoints with clear documentation.

### III. Session-Based Authentication
Robust session-cookie authentication via Better-Auth integration, consuming backend session endpoints exactly as specified. No client-side token storage beyond in-memory/session cookies; follow backend session semantics strictly.

### IV. Type-Safe API Layer
Typed service layer (/lib/api/*) with automatically generated TypeScript request/response types from API specification documents. Centralized error handling and retry policies for network failures.

### V. Regal POS Visual Identity
Consistent yellow/white/black brand theme throughout the application. Large cards, compact dense tables for POS screens, with serif headings where appropriate. Maintain visual consistency across all components.

### VI. Comprehensive Feature Coverage
Complete implementation of all CRUD operations for Products, Customers, Vendors, Salesmen, Stock, Expenses, and Invoice management as specified in the backend API documentation. Full feature parity with backend capabilities.

## Code Quality & Tooling Standards

All code must maintain strict TypeScript (strict: true), follow ESLint and Prettier standards, include comprehensive unit and E2E tests using Playwright, and maintain accessibility compliance (ARIA, keyboard navigation, contrast checks). Dockerized development environment required with clear README documentation.

## Development Workflow

Follow Spec-Driven Development methodology with clear separation of business requirements from technical implementation. Use feature branches, maintain clean commit history, implement proper error handling, optimistic updates, and validation. All changes must pass automated tests before merging.

## Security & Authentication

Secure session management with automatic validation on route changes and server-side checks for protected pages. No hardcoded secrets; use environment variables and provide .env.example. Implement proper input validation and sanitization to prevent injection attacks.

## Governance

This constitution governs all development activities for the Regal POS frontend project. All PRs must demonstrate compliance with these principles. Changes to this constitution require formal amendment process with justification and approval. Code reviews must verify adherence to all principles before approval.

**Version**: 1.0.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-02-13
