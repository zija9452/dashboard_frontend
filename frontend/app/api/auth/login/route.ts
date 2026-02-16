import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json();

    // Forward the login request to the backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/session-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        role, // Include the selected role
      }),
    });

    if (backendResponse.ok) {
      // Extract cookies from backend response
      const setCookieHeader = backendResponse.headers.get('set-cookie');
      
      // Create response with backend data
      const backendData = await backendResponse.json();
      const response = NextResponse.json(backendData);

      // Forward the session cookie from backend to frontend
      if (setCookieHeader) {
        // Parse the Set-Cookie header to extract cookie information
        const cookieMatch = setCookieHeader.match(/session_token=([^;]+)/);
        if (cookieMatch) {
          const sessionToken = cookieMatch[1];
          
          // Set the session token as a cookie in the frontend response
          response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
            sameSite: 'lax',
          });
        }
      }

      return response;
    } else {
      // Return the error from the backend
      const errorData = await backendResponse.json().catch(() => ({ error: 'Login failed' }));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}