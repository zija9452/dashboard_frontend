import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies from the request to forward to the backend
    const cookieHeader = request.headers.get('cookie') || '';
    
    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Forward the session validation request to the backend
    // Use the /admin/ endpoint which requires authentication to validate the session
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/admin/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (response.ok) {
      // If the request succeeds, the user is authenticated
      // We could return user info from the response, but for session validation
      // we just need to confirm the user is authenticated
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'authenticated-user', // Backend will provide actual user data if needed
          name: 'Authenticated User',
          role: 'admin', // Actual role will be determined by backend
          branch: 'Main Branch' // Actual branch will be determined by backend
        }
      });
    } else {
      // If backend session validation fails, return unauthenticated
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}