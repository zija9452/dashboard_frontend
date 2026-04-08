import { NextRequest } from 'next/server';

// GET /api/vendors/viewvendor - Get vendors with pagination (matches backend /vendors/viewvendor)
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const searchParams = request.nextUrl.searchParams;

    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '8';
    const search_string = searchParams.get('search_string') || '';
    const branches = searchParams.get('branches') || '';
    const searchphone = searchParams.get('searchphone') || '';
    const searchaddress = searchParams.get('searchaddress') || '';

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search_string) params.append('search_string', search_string);
    if (branches) params.append('branches', branches);
    if (searchphone) params.append('searchphone', searchphone);
    if (searchaddress) params.append('searchaddress', searchaddress);

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/vendors/viewvendor?${params.toString()}`;

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
      signal: AbortSignal.timeout(120000),
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
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
