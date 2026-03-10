import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies from the request to forward to the backend
    const cookieHeader = request.headers.get('cookie') || '';

    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Fetch current user from backend using session cookie
    // The backend should have an endpoint that returns current user info
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      
      return NextResponse.json({
        authenticated: true,
        user: userData
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