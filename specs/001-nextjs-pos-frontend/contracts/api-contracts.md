# API Contracts: Next.js POS Frontend

**Date**: 2026-02-13
**Feature**: 001-nextjs-pos-frontend

## Overview
This document defines the API contracts between the Next.js frontend and the backend services based on the `Future_Frontend_API/*.md` documentation.

## Authentication API

### Login
- **Endpoint**: `POST /auth/session-login`
- **Description**: Authenticate user and establish session
- **Request**:
  - Method: POST
  - Content-Type: application/x-www-form-urlencoded
  - Body: `username={string}&password={string}`
- **Response**:
  - Status: 200 OK
  - Headers: Set-Cookie with session cookie
  - Body: Session establishment confirmation
- **Error Responses**:
  - 401: Invalid credentials

### Session Validation
- **Mechanism**: Session cookie automatically included in requests
- **Description**: Backend validates session on protected endpoints
- **Error Responses**:
  - 401: Session expired/invalid

## Product Management API

### Get All Products
- **Endpoint**: `GET /products/`
- **Description**: Retrieve list of all products with pagination
- **Authentication**: Admin or cashier role required
- **Query Parameters**:
  - `skip`: Number of records to skip (default: 0)
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of product objects with all fields

### Get Product by ID
- **Endpoint**: `GET /products/{id}`
- **Description**: Retrieve specific product by ID
- **Authentication**: Admin or cashier role required
- **Response**:
  - Status: 200 OK
  - Body: Single product object with all fields

### Create Product
- **Endpoint**: `POST /products/`
- **Description**: Create a new product
- **Authentication**: Employee role required
- **Request Body**:
  ```json
  {
    "sku": "string",
    "name": "string",
    "desc": "string (optional)",
    "unit_price": "number",
    "cost_price": "number",
    "stock_level": "number",
    "category": "string",
    "barcode": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Created product object with all fields

### Update Product
- **Endpoint**: `PUT /products/{id}`
- **Description**: Update existing product
- **Authentication**: Employee role required
- **Request Body** (optional fields):
  ```json
  {
    "name": "string",
    "unit_price": "number",
    "stock_level": "number"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Updated product object

### Delete Product
- **Endpoint**: `DELETE /products/{id}`
- **Description**: Delete product by ID
- **Authentication**: Admin role required
- **Response**:
  - Status: 200 OK
  - Body: Success message

## Customer Management API

### Create Customer
- **Endpoint**: `POST /customer-invoice/Customers`
- **Description**: Create a new customer
- **Authentication**: Cashier role required
- **Request Body**:
  ```json
  {
    "cus_name": "string",
    "cus_phone": "string",
    "cus_address": "string",
    "cus_cnic": "string",
    "cus_sal_id_fk": "string (optional)"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Created customer information

### Get Customer Details
- **Endpoint**: `POST /customer-invoice/GetCustomerDetails`
- **Description**: Get customer details by name
- **Authentication**: Cashier role required
- **Request Body**:
  ```json
  {
    "cus_name": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Customer details object

## Invoice Management API

### Create Customer Invoice
- **Endpoint**: `POST /customer-invoice/SaveCustomerOrders`
- **Description**: Create a new customer invoice
- **Authentication**: Admin role required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "pro_name": "string",
        "pro_quantity": "number",
        "unit_price": "number",
        "discount": "number",
        "cat_name": "string"
      }
    ],
    "customer_id": "string",
    "customer_name": "string",
    "team_name": "string",
    "payment_method": "string",
    "initial_paid_amount": "number",
    "remarks": "string",
    "salesman_id": "string",
    "timezone": "string",
    "date": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Base64 encoded PDF receipt

### View Customer Orders
- **Endpoint**: `GET /customer-invoice/Viewcustomerorder`
- **Description**: View customer orders with filtering
- **Authentication**: Admin role required
- **Query Parameters** (optional):
  - `searchString`: Search term for filtering
  - `status`: Filter by status (issued, paid, partial, cancelled)
  - `skip`: Number of records to skip
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of customer orders

## Stock Management API

### View Stock
- **Endpoint**: `GET /admin/ViewStock`
- **Description**: View stock with search and branch filtering
- **Authentication**: Admin role required
- **Query Parameters** (optional):
  - `search_string`: Search term to filter products
  - `branches`: Branch to filter by
  - `shelf`: Shelf to filter by
  - `skip`: Number of records to skip
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of stock items

### Generate ZPL for Barcodes
- **Endpoint**: `POST /admin/PrintBarcodes`
- **Description**: Generate ZPL commands for printing barcodes
- **Authentication**: Admin role required
- **Query Parameters**:
  - `pro_name`: Product name to print barcodes for
  - `quantity`: Number of barcodes to print
  - `barcode`: Specific barcode to use (optional)
- **Response**:
  - Status: 200 OK
  - Body: Object containing ZPL commands

## Vendor Management API

### Get All Vendors
- **Endpoint**: `GET /vendors/`
- **Description**: Get list of vendors with pagination
- **Authentication**: Employee role or higher required
- **Query Parameters** (optional):
  - `skip`: Number of records to skip
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of vendor objects

### Create Vendor
- **Endpoint**: `POST /vendors/`
- **Description**: Create a new vendor
- **Authentication**: Admin role required
- **Request Body**:
  ```json
  {
    "name": "string",
    "contacts": "string (JSON)",
    "terms": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Created vendor object

## Salesman Management API

### Get All Salesmen
- **Endpoint**: `GET /salesmen/`
- **Description**: Get list of salesmen with pagination
- **Authentication**: Employee role or higher required
- **Query Parameters** (optional):
  - `skip`: Number of records to skip
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of salesman objects

### Create Salesman
- **Endpoint**: `POST /salesmen/`
- **Description**: Create a new salesman
- **Authentication**: Admin role required
- **Request Body**:
  ```json
  {
    "name": "string",
    "code": "string",
    "phone": "string (optional)",
    "address": "string (optional)",
    "branch": "string (optional)",
    "commission_rate": "number (optional)"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Created salesman object

## Expense Management API

### Get All Expenses
- **Endpoint**: `GET /expenses/`
- **Description**: Get list of expenses with pagination
- **Authentication**: Employee role or higher required
- **Query Parameters** (optional):
  - `created_by`: User ID to filter by
  - `skip`: Number of records to skip
  - `limit`: Maximum number of records (default: 100)
- **Response**:
  - Status: 200 OK
  - Body: Array of expense objects

### Create Expense
- **Endpoint**: `POST /expenses/`
- **Description**: Create a new expense
- **Authentication**: Employee role or higher required
- **Request Body**:
  ```json
  {
    "expense_type": "string",
    "amount": "number",
    "date": "string",
    "note": "string",
    "created_by": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Created expense object

## Walk-in Invoice API

### Create Walk-in Invoice
- **Endpoint**: `POST /walkin-invoice/walkin-invoices`
- **Description**: Create a new walk-in invoice
- **Authentication**: Admin role required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "pro_name": "string",
        "pro_quantity": "number",
        "unit_price": "number",
        "discount": "number",
        "cat_name": "string"
      }
    ],
    "customer_id": "string",
    "salesman_id": "string",
    "payment_method": "string",
    "notes": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Base64 encoded PDF receipt

## Walk-in Refund API

### Create Walk-in Invoice Refund
- **Endpoint**: `POST /walkin-refund/refunds/walkin-invoice`
- **Description**: Create a refund for a walk-in invoice
- **Authentication**: Admin or cashier role required
- **Request Body**:
  ```json
  {
    "invoice_id": "string",
    "refunded_items": [
      {
        "product_name": "string",
        "quantity_returned": "number"
      }
    ],
    "amount": "number",
    "reason": "string",
    "customer_id": "string"
  }
  ```
- **Response**:
  - Status: 200 OK
  - Body: Base64 encoded PDF receipt

## Error Handling

### Standard Error Response Format
All API endpoints return standardized error responses:
```json
{
  "error": {
    "type": "error_type",
    "message": "Human-readable error message",
    "status_code": 400,
    "path": "/endpoint/path",
    "timestamp": "2026-01-31T11:00:00.000000"
  }
}
```

### Common Error Types
- `400 Bad Request`: Invalid input parameters or format
- `401 Unauthorized`: Missing or invalid session cookie
- `403 Forbidden`: Insufficient permissions for the requested action
- `404 Not Found`: Requested resource not found
- `422 Unprocessable Entity`: Validation error in request body
- `500 Internal Server Error`: Unexpected server error