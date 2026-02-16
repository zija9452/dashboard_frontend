import { NextRequest, NextResponse } from 'next/server';

// Login route
export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);

  if (pathname.endsWith('/login')) {
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    // Forward the login request to the backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/session-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        role,
      }),
    });

    // Set the session cookie from the backend response
    if (response.ok) {
      const setCookies = response.headers.get('Set-Cookie');
      if (setCookies) {
        const nextResponse = NextResponse.redirect(new URL('/dashboard', request.url));
        nextResponse.headers.set('Set-Cookie', setCookies);
        return nextResponse;
      }
    }

    return NextResponse.json({ error: 'Login failed' }, { status: response.status });
  }

  if (pathname.endsWith('/logout')) {
    // Forward the logout request to the backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      // Clear the session cookie
      const nextResponse = NextResponse.json({ message: 'Logged out successfully' });
      nextResponse.headers.set('Set-Cookie', 'sessionid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      return nextResponse;
    }

    return NextResponse.json({ error: 'Logout failed' }, { status: response.status });
  }

  return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
}