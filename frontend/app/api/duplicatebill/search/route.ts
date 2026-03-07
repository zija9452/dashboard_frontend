import { NextRequest } from 'next/server';

// GET /api/duplicatebill/search - Search for invoices
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const searchParams = request.nextUrl.searchParams;

    const search_query = searchParams.get('search_query') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '8';

    // Build query string
    const queryParams = new URLSearchParams();
    if (search_query) {
      queryParams.append('search_query', search_query);
    }
    queryParams.append('page', page);
    queryParams.append('limit', limit);

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/duplicatebill/search?${queryParams.toString()}`;

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
      // Forward 401 status for global handler
      if (response.status === 401) {
        return Response.json(
          { error: 'Unauthorized - please login', status: 401 },
          { status: 401 }
        );
      }

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
    console.error('Error fetching duplicate bills:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
