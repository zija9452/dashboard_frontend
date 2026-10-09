import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Forward a request to a backend path (payment-proofs / payments-record) with the
 * session cookie. JSON and multipart bodies are passed on as they came.
 * Errors come back as { error, status } like the other proxy routes.
 */
export async function proxyBackend(request: NextRequest, backendPath: string, method: string) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const query = request.nextUrl.searchParams.toString();
    const backendUrl = `${API_BASE}/${backendPath}${query ? '?' + query : ''}`;

    const headers: Record<string, string> = {};
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    let body: BodyInit | undefined;
    if (method !== 'GET') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        body = await request.formData(); // fetch sets the boundary itself
      } else if (contentType.includes('application/json')) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(await request.json());
      }
    }

    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000), // screenshot uploads can be slow
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
      return Response.json({ error: errorMessage, status: response.status }, { status: response.status });
    }

    return Response.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error(`Error in ${method} /${backendPath}:`, error);
    if (error instanceof Error && error.name === 'TimeoutError') {
      return Response.json({ error: 'Request timeout. Please try again.', type: 'TIMEOUT' }, { status: 504 });
    }
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
