import { NextRequest } from 'next/server';

// GET /api/dashboard/warehouse-stats - Get warehouse dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const searchParams = request.nextUrl.searchParams;
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    // Build backend URL
    let backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/warehouse-salesview/dashboard/stats`;

    const params = new URLSearchParams();
    if (from_date) params.append('from_date', from_date);
    if (to_date) params.append('to_date', to_date);
    if (month && !from_date) params.append('month', month);
    if (year && !from_date) params.append('year', year);

    if (params.toString()) {
      backendUrl += `?${params.toString()}`;
    }

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
      const errorText = await response.text();
      return Response.json(
        { error: errorText || 'Backend request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching warehouse dashboard stats:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
