import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type BodyKind = 'none' | 'json' | 'multipart';

/**
 * Forward a request to the backend /cash-deposits endpoints with the session
 * cookie. Errors come back as { error, status } like the other proxy routes.
 */
export async function proxyCashDeposits(
  request: NextRequest,
  path: string,
  method: string,
  bodyKind: BodyKind = 'none',
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const query = request.nextUrl.searchParams.toString();
    const backendUrl = `${API_BASE}/cash-deposits/${path}${query ? '?' + query : ''}`;

    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    let body: BodyInit | undefined;
    if (bodyKind === 'json') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(await request.json());
    } else if (bodyKind === 'multipart') {
      // fetch sets the multipart boundary itself
      body = await request.formData();
    }

    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000), // slip uploads can be slow
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Backend request failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return Response.json(
        { error: errorMessage, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error(`Error in cash-deposits ${method} /${path}:`, error);
    if (error instanceof Error && error.name === 'TimeoutError') {
      return Response.json(
        { error: 'Request timeout. Please try again.', type: 'TIMEOUT' },
        { status: 504 }
      );
    }
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
