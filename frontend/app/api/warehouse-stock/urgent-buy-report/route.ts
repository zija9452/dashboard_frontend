import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/warehouse-stock/urgent-buy-report`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: errorText || 'Backend request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching urgent buy report:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
