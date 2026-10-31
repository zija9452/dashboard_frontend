import { NextRequest } from 'next/server';

// GET /api/stock/batches/{productId} - A product's shop stock in this branch: Old Stock + batch lines
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/stock/batches/${encodeURIComponent(productId)}`;

    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json(
        { error: data.detail || 'Backend request failed', status: response.status },
        { status: response.status }
      );
    }
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching batch lines:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
