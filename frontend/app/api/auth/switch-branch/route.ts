import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/switch-branch - Admin moves the current login to another branch
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { branch } = await request.json();

    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/switch-branch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({ branch }),
    });

    const data = await backendResponse.json();
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error?.message || data.detail || 'Switch branch failed' },
        { status: backendResponse.status }
      );
    }

    const response = NextResponse.json(data);

    // Backend created a new session in the target branch: replace both cookies
    const setCookieHeader = backendResponse.headers.get('set-cookie') || '';
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 10, // 10 hours
      path: '/',
      sameSite: 'lax' as const,
    };
    const sessionMatch = setCookieHeader.match(/(?:^|,\s*)session_token=([^;,]+)/);
    const branchMatch = setCookieHeader.match(/(?:^|,\s*)branch=([^;,]+)/);
    if (sessionMatch) {
      response.cookies.set('session_token', sessionMatch[1], cookieOptions);
    }
    if (branchMatch) {
      response.cookies.set('branch', branchMatch[1], cookieOptions);
    }

    return response;
  } catch (error) {
    console.error('Switch branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
