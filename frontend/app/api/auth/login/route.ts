import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // In a real implementation, this would authenticate with the backend
    // For now, we'll simulate authentication with a mock response

    // Validate credentials (mock validation)
    if (username === 'admin' && password === 'admin123') {
      // Create a mock session response
      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: 'user-123',
          name: 'Admin User',
          role: 'admin',
          branch: 'Main Branch'
        }
      });

      // Set a mock session cookie
      response.cookies.set('sessionid', 'mock-session-id-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
        sameSite: 'lax',
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}