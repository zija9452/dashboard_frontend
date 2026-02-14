import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In a real implementation, this would invalidate the session with the backend
    // For now, we'll just clear the session cookie

    const response = NextResponse.json({ message: 'Logged out successfully' });

    // Clear the session cookie
    response.cookies.set('sessionid', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}