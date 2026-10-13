import { NextRequest } from 'next/server';

// POST /api/stock/transfer/save - Send shop stock to the other branch
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/stock/transfer/save`;

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
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // detail is a string, or { message, items } when some items are blocked
      const detail = data.detail;
      const error = typeof detail === 'string' ? detail : detail?.message || 'Backend request failed';
      return Response.json(
        { error, items: detail?.items ?? null, status: response.status },
        { status: response.status }
      );
    }
    return Response.json(data);
  } catch (error) {
    console.error('Error in stock transfer save:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
