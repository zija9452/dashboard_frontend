# Implementation Tasks: Next.js POS Frontend

**Feature**: Next.js POS Frontend
**Date**: 2026-02-13
**Branch**: 001-nextjs-pos-frontend

## Summary

This document outlines the implementation tasks for building a production-grade Next.js frontend consuming the existing Python FastAPI + Neon backend with session-cookie authentication and regal POS UI featuring yellow/white/black theme. Implements full CRUD operations for all business entities (products, customers, vendors, salesmen, stock, invoices) with ZPL printing support for barcode labels.

## Implementation Strategy

This implementation follows an iterative approach focusing on delivering core functionality early. The strategy prioritizes:

- **MVP First**: User Story 1 (Authentication & Dashboard) provides immediate value
- **Incremental Delivery**: Each user story builds upon the previous with complete functionality
- **Parallel Execution**: Where possible, tasks are designed to be executed in parallel without dependencies

### MVP Scope (Phase 1)
- Basic Next.js project setup with TypeScript and Tailwind CSS
- Authentication system with login/logout functionality
- Dashboard with basic layout and navigation
- Basic product CRUD functionality

### Implementation Phases

1. **Setup Phase**: Project scaffolding and toolchain setup
2. **Foundational Phase**: Core infrastructure (auth, API layer, components)
3. **User Story Phases**: Each user story implemented as a complete, testable increment
4. **Polish Phase**: Cross-cutting concerns and final touches

---

## Phase 1: Setup (Project Initialization)

### Goal
Establish the project foundation with all necessary tooling and basic structure.

### Independent Test Criteria
- Project can be created and basic development server can be started
- TypeScript compiles without errors
- Basic styling is applied with theme tokens

### Tasks

- [X] T001 Create Next.js project with TypeScript, Tailwind CSS, and App Router
- [X] T002 [P] Initialize package.json with required dependencies (Next.js, TypeScript, Tailwind CSS, Better-Auth, Zebra Technologies, Playwright, Docker)
- [X] T003 [P] Configure TypeScript with strict mode (strict: true)
- [X] T004 [P] Set up Tailwind CSS configuration with yellow/white/black theme tokens
- [X] T005 [P] Configure ESLint and Prettier with appropriate rules for TypeScript and React
- [X] T006 [P] Create Dockerfile and docker-compose.dev.yml for development environment
- [X] T007 Create basic Next.js app directory structure following the planned architecture
- [X] T008 [P] Set up basic git configuration and .gitignore file
- [X] T009 Verify pnpm dev command runs successfully and TypeScript compiles with --noEmit flag

---

## Phase 2: Foundational (Blocking Prerequisites)

### Goal
Establish core infrastructure that all user stories depend on: authentication, API layer, and reusable components.

### Independent Test Criteria
- Authentication system can protect routes and handle login/logout
- API layer can connect to backend endpoints with proper typing
- Basic UI components are reusable and styled consistently

### Tasks

- [X] T010 Implement Better-Auth adapter with session-cookie integration for login/logout
- [X] T011 Create withSessionSSR wrapper for server-side protected routes
- [X] T012 Implement useSession() hook for client-side session management
- [X] T013 [P] Parse Future_Frontend_API/*.md and auto-generate lib/api/ stubs
- [X] T014 [P] Create central fetch wrapper with error handling and retry policy
- [X] T015 [P] Generate API service files for each entity (products, customers, vendors, etc.) with TypeScript interfaces
- [X] T016 [P] Create reusable UI components (Button, Input, Modal, DataTable, Form hooks)
- [X] T017 [P] Implement global error handling with user-visible toasts
- [X] T018 [P] Set up global layout with top nav and side navigation
- [X] T019 [P] Add role-based UI flags to control feature visibility by session role
- [X] T020 Create example protected route to demonstrate authentication functionality

---

## Phase 3: [US1] Authenticate and Access Dashboard (Priority: P1)

### Goal
Implement secure authentication and dashboard access for POS users to perform daily operations.

### Story Requirements
- Users must securely log into the system to access the dashboard
- Authentication must use existing backend session-cookie endpoints
- Dashboard provides key metrics and quick actions

### Independent Test Criteria
- User can log in with valid credentials and access the dashboard
- Failed login attempts are properly rejected with appropriate error messages
- Protected routes redirect to login when session is invalid

### Acceptance Scenarios
1. Given user has valid credentials, when they enter credentials on login page, then they are authenticated via backend session-cookie and redirected to dashboard
2. Given user has invalid credentials, when they attempt to log in, then they receive an appropriate error message and remain on login page

### Implementation Tasks

- [X] T021 Create login page with form for username/password input
- [X] T022 [P] Implement login form submission using POST /auth/session-login endpoint
- [X] T023 [P] Add login error handling and user feedback display
- [X] T024 Create dashboard page with KPI cards and quick actions
- [X] T025 [P] Add dashboard data fetching with appropriate role-based permissions
- [X] T026 [P] Implement protected route middleware to redirect to login when session invalid
- [X] T027 [P] Add logout functionality that clears client state and redirects to login
- [X] T028 [P] Implement session validation on route changes and server-side checks
- [X] T029 [P] Add dashboard loading states and error boundaries
- [X] T030 [P] Ensure dashboard meets 10-second login-to-access requirement (SC-001)

---

## Phase 4: [US2] Manage Products (Priority: P1)

### Goal
Implement product management functionality for creating, updating, deleting, and searching products to maintain accurate inventory.

### Story Requirements
- Users must be able to create, read, update, and delete products via backend API endpoints
- Product management must follow yellow/white/black brand palette
- System must maintain strict TypeScript typing with no `any` types in API surface

### Independent Test Criteria
- User can create a new product with valid details and see it in the product list
- User can update product details and see changes reflected in the product list
- User can delete a product and confirm it's removed from the system

### Acceptance Scenarios
1. Given user is logged in and on products page, when they create a new product with valid details, then the product is saved via backend API and appears in the product list
2. Given user has selected a product, when they update product details, then changes are saved and reflected in the product list
3. Given user has selected a product, when they delete the product, then it is removed from the system and no longer appears in the list

### Implementation Tasks

- [X] T031 Create products list page with search and filtering capabilities
- [X] T032 [P] Implement product data fetching from GET /products/ endpoint
- [X] T033 [P] Add pagination support for product list using skip/limit parameters
- [X] T034 Create product form component for create/update operations
- [X] T035 [P] Implement product creation using POST /products/ endpoint
- [X] T036 [P] Implement product update using PUT /products/{id} endpoint
- [X] T037 [P] Implement product deletion using DELETE /products/{id} endpoint
- [X] T038 [P] Add form validation based on Product entity requirements
- [X] T039 [P] Add optimistic updates for product list operations
- [X] T040 [P] Ensure CRUD operations complete successfully 99% of the time under normal conditions (SC-002)

---

## Phase 5: [US3] Process Customer Invoices (Priority: P1)

### Goal
Implement customer invoice creation and management to facilitate sales transactions and maintain payment records.

### Story Requirements
- Users must be able to create customer invoices with proper validation against API specifications
- Invoice system must handle payment processing and status tracking
- System must maintain yellow/white/black brand palette throughout invoice UI

### Independent Test Criteria
- User can create a new customer invoice with valid details and see it in the invoice list
- User can view an existing invoice and see all details displayed correctly with accurate payment status

### Acceptance Scenarios
1. Given user is logged in and on customer invoice page, when they create a new customer invoice with valid details, then the invoice is saved via backend API and appears in the invoice list
2. Given user has created an invoice, when they view it, then all details are displayed correctly and payment status is accurate

### Implementation Tasks

- [X] T041 Create customer invoice form with item selection and pricing
- [X] T042 [P] Implement invoice creation using POST /customer-invoice/SaveCustomerOrders endpoint
- [X] T043 [P] Add invoice validation based on Customer Invoice entity requirements
- [X] T044 [P] Create invoice list page with search and filtering capabilities
- [X] T045 [P] Implement invoice data fetching from GET /customer-invoice/Viewcustomerorder endpoint
- [X] T046 [P] Add invoice detail view page showing all invoice information
- [X] T047 [P] Implement payment processing using PUT /customer-invoice/process-payment/{order_id} endpoint
- [X] T048 [P] Add invoice status tracking with proper state transitions
- [X] T049 [P] Implement customer lookup functionality for invoice creation
- [X] T050 [P] Add proper error handling for invoice validation and API responses

---

## Phase 6: [US4] Handle ZPL Label Printing (Priority: P2)

### Goal
Implement ZPL barcode label generation and printing with support for both direct USB and server-side printing options.

### Story Requirements
- System must provide ZPL preview rendering when ZPL strings are returned from backend APIs
- System must offer WebUSB printing with server-proxy fallback for ZPL labels
- Preview must show approximate layout of the label before printing

### Independent Test Criteria
- User can generate a ZPL label and see a preview showing the approximate layout
- System attempts WebUSB printing and falls back to server-side printing if needed

### Acceptance Scenarios
1. Given user has created a product requiring a label, when they generate a ZPL label, then a preview is displayed showing the approximate layout
2. Given ZPL preview is available, when user selects print option, then the system attempts WebUSB printing and falls back to server-side printing if needed

### Implementation Tasks

- [X] T051 Create ZPL preview component that renders canvas preview from ZPL commands
- [X] T052 [P] Implement ZPL renderer utility to convert ZPL commands to canvas
- [X] T053 [P] Add ZPL command generation using POST /admin/PrintBarcodes endpoint
- [X] T054 [P] Implement WebUSB print handler for direct printer access
- [X] T055 [P] Create server proxy for ZPL printing fallback option
- [X] T056 [P] Add print controls UI with options: Print (WebUSB), Send to Server, Export ZPL, Copy
- [X] T057 [P] Create USB instructions modal explaining pairing and permissions
- [X] T058 [P] Add ZPL preview rendering within 2 seconds of API response (SC-005)
- [X] T059 [P] Implement proper error handling for printing operations
- [X] T060 [P] Add export and copy functionality for manual printing scenarios

---

## Phase 7: [US5] Manage Stock Levels (Priority: P2)

### Goal
Implement stock level tracking and adjustment functionality to maintain accurate inventory.

### Story Requirements
- Users must be able to manage all entity types: products, customers, vendors, salesmen, stock, expenses
- Stock management must support viewing, adding, and adjusting inventory levels
- System must provide search capabilities for stock items

### Independent Test Criteria
- User can view stock levels and see current quantities for products
- User can adjust a product's quantity and see the change reflected in the system

### Acceptance Scenarios
1. Given user is viewing stock levels, when they adjust a product's quantity, then the change is saved via backend API and reflected in the stock report

### Implementation Tasks

- [ ] T061 Create stock list page with search by name/barcode functionality
- [ ] T062 [P] Implement stock data fetching from GET /admin/ViewStock endpoint
- [ ] T063 [P] Add stock search and filtering capabilities using query parameters
- [ ] T064 Create stock adjustment form for modifying quantities
- [ ] T065 [P] Implement stock adjustment using POST /admin/Adjuststock endpoint
- [ ] T066 [P] Add stock addition functionality using POST /admin/SaveStockIn endpoint
- [ ] T067 [P] Create stock report view with summary information
- [ ] T068 [P] Add barcode scanning support for stock operations
- [ ] T069 [P] Implement optimistic updates for stock level changes
- [ ] T070 [P] Add proper validation for stock adjustment operations

---

## Phase 8: [US6] Process Walk-in Sales (Priority: P2)

### Goal
Implement walk-in invoice creation for customers without accounts or pre-orders.

### Story Requirements
- System must support walk-in invoices separate from customer invoices
- Walk-in invoices must be processed and recorded via backend API
- System must follow yellow/white/black brand palette for walk-in UI

### Independent Test Criteria
- User can create a walk-in invoice for a customer without an account
- The transaction is properly recorded via the backend API

### Acceptance Scenarios
1. Given user is logged in and on walk-in invoice page, when they create a new walk-in invoice, then the transaction is recorded via backend API

### Implementation Tasks

- [ ] T071 Create walk-in invoice form for quick transaction processing
- [ ] T072 [P] Implement walk-in invoice creation using POST /walkin-invoice/walkin-invoices endpoint
- [ ] T073 [P] Add walk-in invoice validation based on Walk-in Invoice entity requirements
- [ ] T074 [P] Create walk-in invoice list page showing recent transactions
- [ ] T075 [P] Implement walk-in invoice data fetching from backend endpoints
- [ ] T076 [P] Add product selection for walk-in invoices with real-time pricing
- [ ] T077 [P] Implement payment processing for walk-in invoices
- [ ] T078 [P] Add receipt generation for walk-in transactions
- [ ] T079 [P] Create simplified UI optimized for quick walk-in transactions
- [ ] T080 [P] Add proper error handling for walk-in invoice operations

---

## Phase 9: [US7] View Sales Reports (Priority: P3)

### Goal
Implement sales reporting functionality with date-range filtering for business performance analysis.

### Story Requirements
- System must generate sales reports by date range for both walk-in and customer invoices
- Reports must be filtered by date and show accurate totals
- System must support export functionality for reports

### Independent Test Criteria
- User can select a date range and see accurate sales data for that period
- Reports can be exported in various formats

### Acceptance Scenarios
1. Given user is logged in and on sales view page, when they select a date range, then the sales report displays accurate data for that period

### Implementation Tasks

- [ ] T081 Create sales view page with date range selection controls
- [ ] T082 [P] Implement date range filtering for sales data
- [ ] T083 [P] Add sales data aggregation from customer and walk-in invoices
- [ ] T084 [P] Create sales charts and visualizations using ChartWrapper component
- [ ] T085 [P] Implement sales report generation for date ranges
- [ ] T086 [P] Add export functionality (CSV/PDF) for sales reports
- [ ] T087 [P] Create summary statistics for sales performance
- [ ] T088 [P] Add filtering options for different report views
- [ ] T089 [P] Implement pagination for large report datasets
- [ ] T090 [P] Add proper loading states and error handling for report generation

---

## Phase 10: Administration and Supporting Features

### Goal
Implement administration functionality and remaining CRUD operations for all business entities.

### Implementation Tasks

- [ ] T091 Create administration page with user management capabilities
- [ ] T092 [P] Implement admin CRUD operations using administrative_api endpoints
- [ ] T093 [P] Create vendor management pages (list, create, update, delete)
- [ ] T094 [P] Create salesman management pages (list, create, update, delete)
- [ ] T095 [P] Create customer management pages with partial payment UI
- [ ] T096 [P] Create expense management pages (list, create, update, delete)
- [ ] T097 [P] Add comprehensive search functionality across all entities
- [ ] T098 [P] Implement bulk operations where appropriate
- [ ] T099 [P] Add audit logging for administrative actions
- [ ] T100 [P] Create role-based permission system for admin features

---

## Phase 11: Invoicing and Refunds

### Goal
Implement advanced invoicing features including custom invoices, walk-in invoices, and refund processing.

### Implementation Tasks

- [ ] T101 Create custom invoice page with advanced validation
- [ ] T102 [P] Implement walk-in invoice management features
- [ ] T103 [P] Create order detail page showing invoice data
- [ ] T104 [P] Add edit/delete actions for invoices
- [ ] T105 [P] Create printable bill view functionality
- [ ] T106 [P] Implement refund UI for walk-in invoices
- [ ] T107 [P] Connect refund functionality to POST /walkin-refund/refunds/walkin-invoice endpoint
- [ ] T108 [P] Add refund validation and processing with UI updates
- [ ] T109 [P] Create duplicate bill functionality showing bills by order ID
- [ ] T110 [P] Add proper error handling for invoicing and refund operations

---

## Phase 12: Testing and Quality Assurance

### Goal
Implement comprehensive testing and quality assurance measures to ensure system reliability.

### Implementation Tasks

- [ ] T111 [P] Set up unit testing framework (Jest/Vitest) for API and utility functions
- [ ] T112 [P] Create unit tests for lib/api/* modules
- [ ] T113 [P] Create unit tests for auth/adapter functionality
- [ ] T114 [P] Create unit tests for zplRenderer and print utilities
- [ ] T115 [P] Set up Playwright E2E testing framework
- [ ] T116 [P] Create E2E test for login/logout functionality
- [ ] T117 [P] Create E2E test for product CRUD operations
- [ ] T118 [P] Create E2E test for customer invoice creation
- [ ] T119 [P] Create E2E test for ZPL printing (with WebUSB mocked)
- [ ] T119 [P] Create E2E test for refund operations
- [ ] T120 [P] Implement accessibility testing with axe-core
- [ ] T121 [P] Run TypeScript compiler with --noEmit flag to ensure strict typing
- [ ] T122 [P] Run ESLint to ensure code quality standards
- [ ] T123 [P] Set up CI pipeline with all tests and quality checks

---

## Phase 13: Documentation and Handoff

### Goal
Create comprehensive documentation and finalize the system for handoff.

### Implementation Tasks

- [ ] T124 Create IMPLEMENTATION.md with architecture and auth flow diagrams
- [ ] T125 [P] Create ACCEPTANCE.md with detailed test steps
- [ ] T126 [P] Update README.md with setup and run instructions
- [ ] T127 [P] Create .env.example with placeholder values
- [ ] T128 [P] Finalize CLARIFY_LOG.md with any remaining items
- [ ] T129 [P] Create deployment documentation
- [ ] T130 [P] Add code comments and documentation for complex logic
- [ ] T131 [P] Create user manual for POS operations
- [ ] T132 [P] Finalize all documentation for handoff
- [ ] T133 [P] Conduct final system validation against success criteria

---

## Dependencies

### User Story Completion Order
1. US1 (Authentication) → Required by all other stories
2. US2 (Products) → Required by US3 (Invoices), US5 (Stock)
3. US3 (Customer Invoices) → Depends on US1, US2
4. US4 (ZPL Printing) → Depends on US2 (Products)
5. US5 (Stock Levels) → Depends on US1, US2
6. US6 (Walk-in Sales) → Depends on US1, US2
7. US7 (Sales Reports) → Depends on US1, US2, US3, US6

### Parallel Execution Examples
- T016-T019 (UI components) can run in parallel with T013-T015 (API layer)
- T031-T040 (Products) can run in parallel with T093-T096 (Vendors/Salesman)
- T041-T050 (Customer Invoices) can run in parallel with T071-T080 (Walk-in Invoices)
- T111-T114 (Unit tests) can run in parallel with T115-T119 (E2E tests)