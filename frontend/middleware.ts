import { NextRequest, NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/administration',
  '/products',
  '/customers',
  '/vendors',
  '/salesman',
  '/stock',
  '/expenses',
  '/invoices',
  '/custom-invoice',
  '/view-custom-order',
  '/sales-view',
  '/duplicate-bill',
  '/refund'
];

export function middleware(request: NextRequest) {
  // Security: Check for credentials in URL parameters and remove them
  const urlParams = request.nextUrl.searchParams;
  if (urlParams.has('username') || urlParams.has('password')) {
    // Remove credentials from URL if they somehow got there
    urlParams.delete('username');
    urlParams.delete('password');
    
    // Create a new URL without the credentials
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.search = urlParams.toString();
    
    // Redirect to the clean URL
    return NextResponse.redirect(cleanUrl);
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check if session cookie exists
    const sessionToken = request.cookies.get('session_token');

    if (!sessionToken) {
      // Redirect to login if no session exists
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify the session with the backend
    // This is a simplified check - in a real app you'd make a request to verify the session
    // For now, we'll just check if the cookie exists
  }

  return NextResponse.next();
}

// Apply middleware to specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};