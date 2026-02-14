# Data Model: Next.js POS Frontend

**Date**: 2026-02-13
**Feature**: 001-nextjs-pos-frontend

## Overview
This document defines the data models for the Next.js POS frontend based on the backend API contracts found in `Future_Frontend_API/*.md`.

## Core Entities

### Product
**Description**: Business item available for sale
**Fields**:
- `id`: UUID (Primary Key)
- `sku`: string (Unique, max 50 chars) - Product identifier
- `name`: string (max 100 chars) - Product name
- `desc`: string (Optional) - Product description
- `unit_price`: decimal (10,2) - Selling price
- `cost_price`: decimal (10,2) - Cost price
- `tax_rate`: decimal (5,2) - Tax rate
- `vendor_id`: UUID (Foreign Key) - Associated vendor
- `stock_level`: integer - Available quantity
- `attributes`: string (Optional) - JSON field for extensibility (used for image paths)
- `barcode`: string (Optional, Unique, max 50 chars) - Barcode
- `discount`: decimal (5,2) - Discount percentage
- `category`: string (Optional, max 50 chars) - Product category
- `branch`: string (Optional, max 50 chars) - Branch location
- `limited_qty`: boolean - Limited quantity flag
- `brand_action`: string (Optional, max 100 chars) - Brand information
- `created_at`: datetime - Creation timestamp
- `updated_at`: datetime - Update timestamp

**Validation**:
- SKU must be unique
- Price values must be positive
- Stock level must be non-negative

### Customer
**Description**: Individual or business purchasing products
**Fields**:
- `id`: UUID (Primary Key)
- `name`: string - Customer name
- `phone`: string - Contact phone number
- `address`: string - Customer address
- `cnic`: string (Optional) - National ID number
- `salesman_id`: UUID (Optional) - Assigned salesman
- `branch`: string - Branch association
- `balance`: decimal - Current account balance

**Validation**:
- Phone number format validation
- Address required

### Vendor
**Description**: Supplier providing products to the business
**Fields**:
- `id`: UUID (Primary Key)
- `name`: string - Vendor name
- `phone`: string - Contact phone number
- `address`: string - Vendor address
- `branch`: string - Branch association

**Validation**:
- Name required
- Phone number format validation

### Salesman
**Description**: Employee responsible for sales activities
**Fields**:
- `id`: UUID (Primary Key)
- `name`: string - Salesman name
- `code`: string (Unique) - Salesman code
- `phone`: string (Optional) - Contact phone number
- `address`: string (Optional) - Address
- `branch`: string - Branch assignment
- `commission_rate`: decimal - Commission rate

**Validation**:
- Code must be unique
- Name required

### Invoice
**Description**: Record of sale transaction (customer-specific or walk-in)
**Fields**:
- `id`: UUID (Primary Key)
- `invoice_no`: string - Invoice number
- `customer_id`: UUID (Foreign Key) - Associated customer
- `salesman_id`: UUID (Foreign Key) - Assigned salesman
- `items`: array of objects - Products in the invoice
- `total_amount`: decimal - Total invoice amount
- `amount_paid`: decimal - Amount paid
- `balance_due`: decimal - Remaining balance
- `payment_status`: enum ('issued', 'paid', 'partial', 'cancelled') - Payment status
- `status`: enum ('issued', 'paid', 'partial', 'cancelled') - Invoice status
- `payment_method`: string - Payment method used
- `notes`: string (Optional) - Additional notes
- `created_at`: datetime - Creation timestamp
- `updated_at`: datetime - Update timestamp

**State Transitions**:
- issued → paid (full payment)
- issued → partial (partial payment)
- issued → cancelled (before payment)

### Invoice Item
**Description**: Individual product within an invoice
**Fields**:
- `product_name`: string - Name of the product
- `quantity`: integer - Quantity purchased
- `unit_price`: decimal - Price per unit
- `discount`: decimal - Applied discount
- `category`: string - Product category

### Expense
**Description**: Business expenditure record
**Fields**:
- `id`: UUID (Primary Key)
- `expense_type`: string - Type of expense
- `amount`: decimal - Expense amount
- `expense_date`: date - Date of expense
- `note`: string (Optional) - Additional notes
- `created_by`: UUID (Foreign Key) - User who created the expense
- `branch`: string - Branch association
- `created_at`: datetime - Creation timestamp

**Validation**:
- Amount must be positive
- Date must be valid

### User (Admin)
**Description**: Staff member with authentication credentials and role-based access
**Fields**:
- `id`: UUID (Primary Key)
- `name`: string - User full name
- `role`: enum ('admin', 'cashier', 'employee') - User role
- `phone`: string (Optional) - Contact phone number
- `address`: string (Optional) - Address
- `cnic`: string (Optional) - National ID number
- `branch`: string - Branch assignment

**Validation**:
- Role must be one of allowed values
- Name required

### Stock
**Description**: Current inventory levels for products with adjustment history
**Fields**:
- `id`: UUID (Primary Key)
- `product_id`: UUID (Foreign Key) - Associated product
- `product_name`: string - Name of the product
- `quantity`: integer - Current quantity
- `branch`: string - Branch location
- `vendor_name`: string - Associated vendor name
- `price`: decimal - Product price
- `cost`: decimal - Product cost
- `barcode`: string - Product barcode
- `discount`: decimal - Applied discount
- `category`: string - Product category
- `brand`: string - Product brand
- `image`: string - Product image path

## Relationships

### Product Relationships
- Belongs to one Vendor (via `vendor_id`)
- Can have many Invoice Items

### Customer Relationships
- Can have many Invoices
- Belongs to one Salesman (via `salesman_id`)

### Salesman Relationships
- Can have many Customers
- Can be associated with many Invoices

### Invoice Relationships
- Belongs to one Customer (via `customer_id`)
- Belongs to one Salesman (via `salesman_id`)
- Has many Invoice Items

### Expense Relationships
- Belongs to one User (via `created_by`)

## API Contract Mapping

### Product API Endpoints
- `GET /products/` - Get all products
- `GET /products/{id}` - Get specific product
- `POST /products/` - Create new product
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

### Customer API Endpoints
- `POST /customer-invoice/Customers` - Create customer
- `POST /customer-invoice/GetCustomerDetails` - Get customer details

### Invoice API Endpoints
- `POST /customer-invoice/SaveCustomerOrders` - Create customer invoice
- `GET /customer-invoice/Viewcustomerorder` - View customer orders
- `PUT /customer-invoice/process-payment/{order_id}` - Process payment

### Stock API Endpoints
- `GET /admin/ViewStock` - View stock
- `POST /admin/Adjuststock` - Adjust stock levels
- `POST /admin/SaveStockIn` - Save stock in transactions

### Vendor API Endpoints
- `GET /admin/GetVendor/{id}` - Get specific vendor
- `GET /admin/Viewvendor` - View vendors
- `POST /admin/Deletevendor/{id}` - Delete vendor

### Expense API Endpoints
- `POST /expenses/` - Create expense
- `GET /expenses/` - Get all expenses
- `GET /expenses/{id}` - Get specific expense
- `PUT /expenses/{id}` - Update expense
- `DELETE /expenses/{id}` - Delete expense