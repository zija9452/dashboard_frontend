import { NextRequest } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest, method: string, path: string) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    // Construct backend URL
    const backendUrl = `${BACKEND_BASE_URL}/warehouse-vendors${path}${searchParams ? '?' + searchParams : ''}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000),
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = await request.text();
    }

    const response = await fetch(backendUrl, options);

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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return Response.json(data);
    } else {
      const text = await response.text();
      return new Response(text, { status: response.status, headers: { 'Content-Type': contentType || 'text/plain' } });
    }
  } catch (error) {
    console.error(`Error in warehouse-vendors proxy (${method} ${path}):`, error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = path ? `/${path.join('/')}` : '/';
  return proxyRequest(request, 'GET', pathStr);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = path ? `/${path.join('/')}` : '/';
  return proxyRequest(request, 'POST', pathStr);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = path ? `/${path.join('/')}` : '/';
  return proxyRequest(request, 'PUT', pathStr);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = path ? `/${path.join('/')}` : '/';
  return proxyRequest(request, 'DELETE', pathStr);
}
