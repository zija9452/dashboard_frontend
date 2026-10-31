import { NextRequest } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Forward /api/warehouse-batches/* to the backend /warehouse-batches/* with the session
 * cookie. Multipart bodies (bill pictures) are re-sent as FormData, JSON as text.
 */
async function proxyRequest(request: NextRequest, method: string, path: string) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const query = request.nextUrl.searchParams.toString();
    const backendUrl = `${BACKEND_BASE_URL}/warehouse-batches${path}${query ? '?' + query : ''}`;

    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    let body: BodyInit | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        // fetch sets the multipart boundary itself
        body = await request.formData();
      } else {
        headers['Content-Type'] = 'application/json';
        body = await request.text();
      }
    }

    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000), // picture uploads can be slow
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
    console.error(`Error in warehouse-batches proxy (${method} ${path}):`, error);
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

type Params = { params: Promise<{ path?: string[] }> };

async function pathOf({ params }: Params) {
  const { path } = await params;
  return path ? `/${path.join('/')}` : '';
}

export async function GET(request: NextRequest, ctx: Params) {
  return proxyRequest(request, 'GET', await pathOf(ctx));
}

export async function POST(request: NextRequest, ctx: Params) {
  return proxyRequest(request, 'POST', await pathOf(ctx));
}

export async function PUT(request: NextRequest, ctx: Params) {
  return proxyRequest(request, 'PUT', await pathOf(ctx));
}

export async function DELETE(request: NextRequest, ctx: Params) {
  return proxyRequest(request, 'DELETE', await pathOf(ctx));
}
