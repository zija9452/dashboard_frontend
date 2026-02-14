# Implementation Decisions: Next.js POS Frontend

**Date**: 2026-02-13
**Feature**: 001-nextjs-pos-frontend

## Overview
This document summarizes key implementation decisions, assumptions, and technical choices made during the development of the Next.js POS frontend that consumes the existing Python FastAPI + Neon backend.

## Authentication & Session Management

### Decision: Cookie-based Session Management
**Choice**: Implement session-cookie integration with backend endpoints using Better-Auth adapter
**Rationale**: Backend uses session-based authentication with HTTP-only cookies for security; aligns with backend's security model
**Implementation**:
- Login via `POST /auth/session-login` with form data
- Session validation through cookie presence and validity
- Client-side session state management with cookie handling
- Logout by clearing client-side state and allowing backend session to expire

### Decision: Role-based Access Control
**Choice**: Implement client-side role checking with backend enforcement
**Rationale**: Backend enforces RBAC with admin, cashier, and employee roles; UI should reflect permissions appropriately
**Implementation**:
- Fetch user role information after successful login
- Conditionally render UI elements based on role permissions
- Backend remains the source of truth for access control

## API Integration Strategy

### Decision: Type-safe API Services
**Choice**: Generate TypeScript interfaces from backend API documentation
**Rationale**: Ensures type safety and reduces runtime errors; matches backend API contracts exactly
**Implementation**:
- Create API service layer (`lib/api/*`) with typed request/response models
- Map 1:1 with backend endpoints as documented in `Future_Frontend_API/*.md`
- Include proper error handling for different response types

### Decision: API Error Handling
**Choice**: Implement centralized error handler with user-visible notifications
**Rationale**: Backend returns standardized error responses that need consistent handling
**Implementation**:
- Global error handler for network failures and API errors
- User-visible toast notifications for API responses
- Retry logic for idempotent operations only

## UI & Brand Identity

### Decision: Regal POS Visual Identity
**Choice**: Implement yellow/white/black theme with compact dense tables for POS screens
**Rationale**: Required by specification for consistent brand identity
**Implementation**:
- Configure Tailwind with yellow (#FFD700), white (#FFFFFF), and black (#000000) as primary colors
- Design compact UI components optimized for POS operations
- Large cards and serif headings where appropriate for "regal" feel

## ZPL Printing Implementation

### Decision: Dual-Path Printing Solution
**Choice**: Implement both WebUSB and server-proxy fallback for ZPL printing
**Rationale**: WebUSB provides direct printing but has browser limitations; server proxy ensures compatibility
**Implementation**:
- Attempt WebUSB printing first for direct printer access
- Fall back to server-side printing via backend print endpoint
- ZPL preview rendering using canvas approximation of label layout
- Export/copy functionality for manual printing scenarios

### Decision: ZPL Rendering Format
**Choice**: Parse ZPL commands to generate visual preview
**Rationale**: Backend returns ZPL commands in standard format that can be visually represented
**Implementation**:
- Parse ZPL commands from `POST /admin/PrintBarcodes` endpoint
- Generate approximate visual preview using canvas or SVG
- Support common ZPL commands for barcode and text rendering

## Business Logic & Data Flow

### Decision: Invoice Status Management
**Choice**: Reflect backend invoice statuses (issued, paid, partial, cancelled) in UI
**Rationale**: Backend defines specific status transitions that must be respected
**Implementation**:
- Display current invoice status clearly in UI
- Enable/disable actions based on current status
- Support partial payment workflows via payment processing endpoints

### Decision: Inventory Management
**Choice**: Real-time stock level synchronization with backend
**Rationale**: Backend manages inventory levels that must be reflected in UI
**Implementation**:
- Fetch current stock levels for product displays
- Update stock indicators after successful transactions
- Handle stock adjustments through appropriate backend endpoints

## Testing & Quality Assurance

### Decision: E2E Testing Strategy
**Choice**: Implement Playwright tests covering core user flows
**Rationale**: Critical business flows need automated verification
**Implementation**:
- Login/logout functionality
- Product CRUD operations
- Customer invoice creation and processing
- ZPL printing workflow (mocked in CI)
- Refund operations

## Security Considerations

### Decision: Client-Side Security
**Choice**: Minimal client storage with backend session reliance
**Rationale**: Backend uses session-cookies for security; client should not persist sensitive data
**Implementation**:
- No token storage in localStorage/sessionStorage
- Rely on HTTP-only cookies managed by backend
- Clear client state on logout
- Secure credential transmission only

## Performance & Optimization

### Decision: Data Fetching Strategy
**Choice**: Implement efficient data fetching with caching
**Rationale**: POS application needs responsive UI with minimal delays
**Implementation**:
- Optimize API calls with pagination parameters
- Cache static data where appropriate
- Implement loading states for better UX
- Debounce search/filter operations

## Deployment & Configuration

### Decision: Environment Configuration
**Choice**: Use standard environment variable approach
**Rationale**: Enables different configurations for dev/staging/prod
**Implementation**:
- Create `.env.example` with placeholder values
- Configure backend API base URL via environment variables
- Separate configurations for different deployment environments