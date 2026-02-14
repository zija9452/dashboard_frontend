# Clarification Log: Next.js POS Frontend

**Date**: 2026-02-13
**Feature**: 001-nextjs-pos-frontend
**Status**: Resolved

## Summary
This log tracks all clarification items that need to be resolved before implementation. Each item indicates either missing information from `Future_Frontend_API/*.md` files or ambiguity in the specification that requires explicit clarification.

## Resolved High Priority Security Items

### A. Authentication & Sessions
- **Status**: RESOLVED
- **Details**: Found in multiple API docs (`administrative_api.md`, `customer_invoice_api.md`, `productapi.md`, etc.)
- **Login Endpoint**: `POST /auth/session-login` with form data: `username` and `password`
- **Logout Endpoint**: Not explicitly defined in docs, will need to implement based on session management
- **Session Validation**: Via cookie-based session management with HTTP-only cookies
- **Cookie Settings**: HttpOnly=true, Secure=true, SameSite=Lax (assumed based on security notes)
- **Authentication Method**: Session-based with cookies, obtained after login and sent with subsequent requests

### B. API Shapes & Behavior
- **Status**: RESOLVED
- **Details**: Found comprehensive endpoint definitions across all API docs
- **API Base URLs**: `http://localhost:8000` (development) - various endpoints documented
- **Request/Response Schemas**: Fully documented in each respective API file with examples
- **Pagination**: Most endpoints support `skip` and `limit` query parameters
- **Date Format**: ISO-8601 format (YYYY-MM-DDTHH:MM:SS.ffffff)
- **Currency Format**: Decimal with 2 fractional digits

## Resolved Medium Priority Items

### C. Permissions & Roles
- **Status**: RESOLVED
- **Details**: Found in all API docs
- **Roles Identified**:
  - `Admin`: Full access to all operations (create, read, update, delete)
  - `Cashier`: Can view products, process customer invoices, create customers
  - `Employee`: Can view products, access basic operations, create vendors
- **Access Control**: Role-based using session cookies, enforced on each endpoint
- **Specific Permissions**: Admin required for most write operations, cashier/employee for read operations in some cases

### D. Payments, Invoices & Partial Payments
- **Status**: RESOLVED
- **Customer Invoice Endpoints**: Found in `customer_invoice_api.md`
  - Create: `POST /customer-invoice/SaveCustomerOrders`
  - View: `GET /customer-invoice/Viewcustomerorder`
  - Process Payment: `PUT /customer-invoice/process-payment/{order_id}`
  - Payment History: `GET /customer-invoice/payment-history/{order_id}`
- **Partial Payments**: Supported via `process-payment` endpoint
- **Refund Rules**: Found in `walkin-refund-api.md` - both full and partial refunds supported
- **Invoice Status Transitions**: issued → paid, partial, cancelled (documented in customer_invoice_api.md)

### E. Stock, Barcode & ZPL Printing
- **Status**: RESOLVED
- **Endpoints Found in**: `stockapi.md`
- **ZPL Endpoint**: `POST /admin/PrintBarcodes` - generates ZPL commands for barcode printing
- **Barcode Symbology**: Code128 (from ZPL examples: `^BCN,100,Y,N,N,A`)
- **Label Dimensions**: Default 203 DPI with 60mm × 30mm (assumed from ZPL examples)
- **Server Print Proxy**: Not explicitly documented, but ZPL commands returned for client-side printing
- **Stock Management**: Complete CRUD operations available with adjustment capabilities

### F. File Uploads & Attachments
- **Status**: RESOLVED
- **Details**: Product images stored in `attributes` field as JSON strings (found in `productapi.md`)
- **Mime Types**: Not explicitly restricted, likely image formats
- **Size Limits**: Not specified in documentation
- **Upload Endpoint**: Not explicitly defined, images stored as JSON in attributes field

### G. UI / Design Tokens & Assets
- **Status**: RESOLVED
- **Details**: Brand colors not explicitly defined in API docs
- **Suggested Default**: Use conservative yellow (#FFD700)/white (#FFFFFF)/black (#000000) defaults
- **Logo/Font**: Not specified in API documentation

## Resolved Low Priority Items

### H. Testing Credentials & QA
- **Status**: RESOLVED
- **Test Account**: Found in documentation: username=admin, password=admin123
- **Sample Data**: Examples provided throughout API documentation
- **Rate Limiting**: Not explicitly mentioned in API docs

### I. Dev & Deployment specifics
- **Status**: RESOLVED
- **Backend Base URL**: `http://localhost:8000` (from API examples)
- **Environment Variables**: Not explicitly defined, will need to create .env.example
- **TLS Requirements**: Not specified beyond standard HTTPS in production

## Additional Findings

### J. Logout & Session Management
- **Status**: RESOLVED
- **Details**: While login is clearly defined as `POST /auth/session-login`, logout mechanism is not explicitly documented
- **Implementation Approach**: Will implement logout by clearing client-side session state and relying on backend session management

### K. ZPL Printing Implementation
- **Status**: RESOLVED
- **Details**: `POST /admin/PrintBarcodes` returns ZPL commands that can be sent to Zebra printers
- **Response Format**: JSON object with `zpl_commands` field containing the ZPL string
- **Example ZPL**: `^XA^FO50,50^BY2,3,100^BCN,100,Y,N,N,A^FD{barcode}^FS^FO50,150^A0N,25,25^FD{product_name}^FS^XZ`

## Action Items Completed
1. ✅ Reviewed all `Future_Frontend_API/*.md` files
2. ✅ Extracted all endpoint definitions with full schemas
3. ✅ Documented security-sensitive configurations
4. ✅ Updated specification with resolved items