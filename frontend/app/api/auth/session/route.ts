import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if session cookie exists in the request
    const sessionId = request.cookies.get('sessionid');

    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // In a real implementation, this would validate the session with the backend
    // For now, we'll simulate a valid session
    return NextResponse.json({
      authenticated: true,
      user: {
        id: 'user-123',
        name: 'Demo User',
        role: 'admin',
        branch: 'Main Branch'
      }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}