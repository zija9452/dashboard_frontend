import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customers/market-balance`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch market balance' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error in market-balance API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
