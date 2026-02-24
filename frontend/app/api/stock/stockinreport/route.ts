import { NextRequest } from 'next/server';

// POST /api/stock/stockinreport - Generate date-wise stock-in report (PDF base64)
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Extract date_from and date_to from query params
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (!dateFrom || !dateTo) {
      return Response.json(
        { error: 'date_from and date_to are required' },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/stock/stockinreport?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;

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
    return Response.json({ pdf: data });
  } catch (error) {
    console.error('Error generating stock-in report:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
