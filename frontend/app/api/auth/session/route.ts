import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies from the request to forward to the backend
    const cookieHeader = request.headers.get('cookie') || '';

    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Since there's no dedicated session validation endpoint,
    // we'll make a request to a protected endpoint to check if session is valid
    // Using the /admin/ endpoint which requires authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/admin/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (response.ok) {
      // If the request succeeds, the user is authenticated
      // Return a basic user object based on the response
      const backendData = await response.json();
      
      // Extract user info from the response (this is a simplified approach)
      // In a real implementation, you might want to call a specific user endpoint
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'current-user-id', // Backend would provide actual user ID
          name: 'Current User',  // Backend would provide actual user name
          role: 'admin',         // Backend would provide actual role
          ...backendData         // Include any other data from the response
        }
      });
    } else {
      // If backend session validation fails, return unauthenticated
      return NextResponse.json({ authenticated: false }, { status: response.status });
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}