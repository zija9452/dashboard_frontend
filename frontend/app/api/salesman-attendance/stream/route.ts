import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/salesman-attendance/stream - Proxies the attendance widget's SSE stream
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/salesman-attendance/stream`;

  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const backendResponse = await fetch(backendUrl, {
    headers,
    cache: 'no-store',
    // @ts-expect-error - Node's fetch requires duplex for a streamed request/response, not yet in the lib.dom types
    duplex: 'half',
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(null, { status: backendResponse.status });
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
