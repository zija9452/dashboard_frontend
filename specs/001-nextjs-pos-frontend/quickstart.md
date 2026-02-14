# Quick Start Guide: Next.js POS Frontend

**Date**: 2026-02-13
**Feature**: 001-nextjs-pos-frontend

## Overview
This guide provides the essential steps to set up, develop, and deploy the Next.js POS frontend that integrates with the existing FastAPI + Neon backend.

## Prerequisites
- Node.js 18+ installed
- pnpm package manager (recommended) or npm/yarn
- Access to the backend API (FastAPI + Neon)
- Modern browser with WebUSB support for ZPL printing

## Setup Instructions

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
pnpm install
# or
npm install
```

### 2. Environment Configuration
Create a `.env.local` file based on the `.env.example`:

```bash
# Copy the example environment file
cp .env.example .env.local
```

Configure the following environment variables:
```env
# Backend API configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000

# Optional: Authentication settings
AUTH_COOKIE_NAME=sessionid
```

### 3. Run the Development Server
```bash
# Start the development server
pnpm dev
# or
npm run dev

# The application will be available at http://localhost:3000
```

### 4. Docker Setup (Alternative)
```bash
# Build and run with Docker Compose
docker-compose.dev up --build
```

## Key Features Setup

### Authentication
The application uses session-cookie based authentication:
- Login via `POST /auth/session-login` endpoint
- Session management through Better-Auth adapter
- Protected routes automatically redirect to login when session expires

### API Integration
API services are auto-generated from the `Future_Frontend_API/*.md` documentation:
- Located in `lib/api/*` directory
- Type-safe services with proper TypeScript interfaces
- Centralized error handling and retry policies

### ZPL Printing
ZPL printing functionality includes:
- Direct WebUSB printing to Zebra label printers
- Server-side proxy fallback for environments without WebUSB support
- WYSIWYG preview of generated ZPL labels
- Export and copy options for manual printing

## Development Workflow

### Running Tests
```bash
# Run unit tests
pnpm test
# or
npm run test

# Run E2E tests with Playwright
pnpm test:e2e
# or
npm run test:e2e

# Run linter
pnpm lint
# or
npm run lint

# Run type checker
pnpm type-check
# or
npm run type-check
```

### Building for Production
```bash
# Build the application
pnpm build
# or
npm run build

# Run the production build locally
pnpm start
# or
npm run start
```

## Project Structure
```
frontend/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── lib/
│   └── api/            # Auto-generated API services
├── auth/               # Authentication integration
├── utils/
│   └── print/          # ZPL printing utilities
├── styles/             # Theme and styling
└── tests/              # Unit and E2E tests
```

## Key Directories and Files

### Pages (`app/`)
Contains all Next.js app router pages organized by feature:
- `login/page.tsx` - Authentication page
- `dashboard/page.tsx` - Main dashboard
- `products/page.tsx` - Product management
- `customers/page.tsx` - Customer management
- And more feature-specific pages

### API Services (`lib/api/`)
Auto-generated type-safe services from backend API documentation:
- `products.ts` - Product management endpoints
- `customers.ts` - Customer management endpoints
- `invoices.ts` - Invoice operations
- `auth.ts` - Authentication endpoints
- And others based on backend API

### Components (`components/ui/`)
Reusable UI components following the regal POS design:
- `Button.tsx` - Standard button component
- `DataTable.tsx` - Data table with sorting and filtering
- `Modal.tsx` - Modal dialog component
- `BarcodePreview.tsx` - ZPL label preview
- `PrintControls.tsx` - Printing interface controls

### Authentication (`auth/`)
Better-Auth integration for session-cookie management:
- `adapter.ts` - Backend API integration
- `session-provider.tsx` - Session context provider
- `middleware.ts` - Protected route handling

## Troubleshooting

### Common Issues

#### API Connection Issues
- Verify backend is running at configured URL
- Check network connectivity between frontend and backend
- Confirm CORS settings allow frontend domain

#### Authentication Problems
- Ensure session cookies are enabled in browser
- Verify backend authentication endpoints are accessible
- Check that no tokens are being stored in localStorage

#### ZPL Printing Issues
- Verify WebUSB permissions are granted in browser
- Check that printer is connected and accessible
- Confirm ZPL commands are being generated correctly

### Development Tips
- Use the Next.js development server for hot reloading
- Leverage TypeScript for type safety
- Check the console for API error details
- Use the network tab to inspect API requests

## Next Steps
1. Customize the theme colors in `styles/theme.ts`
2. Add additional pages as needed for your business requirements
3. Extend API services for any custom backend endpoints
4. Add more comprehensive tests for your specific use cases
5. Configure deployment settings for your production environment