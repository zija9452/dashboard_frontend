# Feature Specification: Next.js POS Frontend

**Feature Branch**: `1-nextjs-pos-frontend`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "A precise, machine-actionable specification for Claude Code CLI to scaffold a production Next.js (app router) + Tailwind + TypeScript frontend that consumes the existing Python FastAPI + Neon Neon backend (use `Future_Frontend_API/*.md` for exact endpoints). Use Better-Auth session-cookie flows and deliver a regal POS UI (yellow / white / black)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and Access Dashboard (Priority: P1)

POS users need to securely log into the system to access the dashboard and perform their daily operations. The authentication must be reliable and use the existing backend session-cookie endpoints.

**Why this priority**: This is foundational - without secure authentication, no other functionality can be accessed. It enables all subsequent user interactions with the system.

**Independent Test**: Can be fully tested by attempting to log in with valid credentials and verifying access to the dashboard, while failed login attempts are properly rejected.

**Acceptance Scenarios**:

1. **Given** user has valid credentials, **When** they enter credentials on login page, **Then** they are authenticated via backend session-cookie and redirected to dashboard
2. **Given** user has invalid credentials, **When** they attempt to log in, **Then** they receive an appropriate error message and remain on login page

---

### User Story 2 - Manage Products (Priority: P1)

Store staff need to manage products in the inventory system, including creating, updating, deleting, and searching for products to maintain accurate inventory records.

**Why this priority**: Core POS functionality - products are the foundation of all sales transactions and inventory management.

**Independent Test**: Can be fully tested by performing CRUD operations on products and verifying they appear correctly in the product list.

**Acceptance Scenarios**:

1. **Given** user is logged in and on products page, **When** they create a new product with valid details, **Then** the product is saved via backend API and appears in the product list
2. **Given** user has selected a product, **When** they update product details, **Then** changes are saved and reflected in the product list
3. **Given** user has selected a product, **When** they delete the product, **Then** it is removed from the system and no longer appears in the list

---

### User Story 3 - Process Customer Invoices (Priority: P1)

Sales staff need to create and manage customer invoices to facilitate sales transactions and maintain customer payment records.

**Why this priority**: Critical business function - the ability to create invoices is essential for revenue generation and customer relationship management.

**Independent Test**: Can be fully tested by creating customer invoices and verifying they are properly stored and accessible.

**Acceptance Scenarios**:

1. **Given** user is logged in and on customer invoice page, **When** they create a new customer invoice with valid details, **Then** the invoice is saved via backend API and appears in the invoice list
2. **Given** user has created an invoice, **When** they view it, **Then** all details are displayed correctly and payment status is accurate

---

### User Story 4 - Handle ZPL Label Printing (Priority: P2)

Inventory staff need to generate and print ZPL barcode labels for products, with support for both direct USB printing and server-side printing options.

**Why this priority**: Important operational function for inventory management and product identification, though not as critical as basic POS functions.

**Independent Test**: Can be fully tested by generating ZPL previews and attempting to print labels using available methods.

**Acceptance Scenarios**:

1. **Given** user has created a product requiring a label, **When** they generate a ZPL label, **Then** a preview is displayed showing the approximate layout
2. **Given** ZPL preview is available, **When** user selects print option, **Then** the system attempts WebUSB printing and falls back to server-side printing if needed

---

### User Story 5 - Manage Stock Levels (Priority: P2)

Warehouse staff need to track and adjust stock levels to maintain accurate inventory and prevent stockouts or overstock situations.

**Why this priority**: Important for inventory control and operational efficiency, supporting the core POS functionality.

**Independent Test**: Can be fully tested by adjusting stock levels and verifying changes are persisted and reflected in the system.

**Acceptance Scenarios**:

1. **Given** user is viewing stock levels, **When** they adjust a product's quantity, **Then** the change is saved via backend API and reflected in the stock report

---

### User Story 6 - Process Walk-in Sales (Priority: P2)

Staff need to create walk-in invoices for customers who purchase items without an existing account or pre-order.

**Why this priority**: Important for capturing all sales, including casual customers who don't have accounts.

**Independent Test**: Can be fully tested by creating walk-in invoices and verifying they are properly processed.

**Acceptance Scenarios**:

1. **Given** user is logged in and on walk-in invoice page, **When** they create a new walk-in invoice, **Then** the transaction is recorded via backend API

---

### User Story 7 - View Sales Reports (Priority: P3)

Managers need to view sales reports by date to analyze business performance and trends.

**Why this priority**: Valuable for business intelligence and strategic decision-making, but not critical for day-to-day operations.

**Independent Test**: Can be fully tested by generating sales reports for different date ranges and verifying data accuracy.

**Acceptance Scenarios**:

1. **Given** user is logged in and on sales view page, **When** they select a date range, **Then** the sales report displays accurate data for that period

---

### Edge Cases

- What happens when network connectivity is lost during an API call?
- How does the system handle session expiration during long operations?
- What occurs when ZPL rendering fails or produces invalid output?
- How does the system behave when backend API endpoints are temporarily unavailable?
- What happens when a user attempts to create a duplicate product with identical identifiers?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via Better-Auth session-cookie integration with backend endpoints
- **FR-002**: System MUST provide protected route access that redirects to login when session is invalid
- **FR-003**: Users MUST be able to create, read, update, and delete products via backend API endpoints
- **FR-004**: System MUST maintain strict TypeScript typing with no `any` types in API surface
- **FR-005**: System MUST implement type-safe API services mapped 1:1 to `Future_Frontend_API/*.md` specifications
- **FR-006**: System MUST provide ZPL preview rendering when ZPL strings are returned from backend APIs
- **FR-007**: System MUST offer WebUSB printing with server-proxy fallback for ZPL labels
- **FR-008**: Users MUST be able to create customer invoices with proper validation against API specifications
- **FR-009**: System MUST implement logout functionality that calls backend logout endpoint and clears client state
- **FR-010**: System MUST provide responsive UI that works across desktop, tablet, and mobile devices
- **FR-011**: System MUST follow yellow/white/black brand palette for "regal POS" visual identity
- **FR-012**: System MUST handle network errors with global error handler and user-visible notifications
- **FR-013**: System MUST implement accessibility features including ARIA labels and keyboard navigation
- **FR-014**: Users MUST be able to manage all entity types: products, customers, vendors, salesmen, stock, expenses
- **FR-015**: System MUST provide comprehensive CRUD operations for administration functions
- **FR-016**: System MUST support refund operations for walk-in invoices by order ID
- **FR-017**: System MUST generate sales reports by date range for both walk-in and customer invoices
- **FR-018**: System MUST provide duplicate bill functionality showing generated bills by order ID
- **FR-019**: System MUST implement proper session validation on route changes and server-side checks

### Key Entities

- **Product**: Business item available for sale, including name, price, category, stock level, barcode
- **Customer**: Individual or business purchasing products, with contact details and payment history
- **Invoice**: Record of sale transaction, either customer-specific or walk-in, with items purchased and payment status
- **Vendor**: Supplier providing products to the business
- **Salesman**: Employee responsible for sales activities
- **Expense**: Business expenditure record with category and amount
- **Stock**: Current inventory levels for products with adjustment history
- **User**: Staff member with authentication credentials and role-based access

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete login and access dashboard within 10 seconds of entering credentials
- **SC-002**: All CRUD operations for products, customers, and other entities complete successfully 99% of the time under normal network conditions
- **SC-003**: End-to-end flows (login/logout, create product, create customer invoice, print ZPL, refund) are covered by Playwright tests with 95% code coverage
- **SC-004**: Protected routes redirect to login page within 1 second when session becomes invalid (both SSR and client checks)
- **SC-005**: ZPL preview renders within 2 seconds of API response and offers both WebUSB and server-proxy printing options
- **SC-006**: UI consistently displays yellow/white/black brand colors across all components and maintains "regal POS" visual identity
- **SC-007**: System provides clear error handling with user-visible toasts for network failures and API errors
- **SC-008**: All pages meet WCAG 2.1 AA accessibility standards for keyboard navigation and screen readers
- **SC-009**: Application successfully builds and runs in both development and production environments without errors
- **SC-010**: README documentation includes clear instructions for environment setup, running tests, and building the application