import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from_date') || '';
    const toDate = url.searchParams.get('to_date') || '';
    
    const cookieHeader = request.headers.get('cookie') || '';
    
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    const queryString = params.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/warehouse-stock/adjustment-report/excel${queryString ? '?' + queryString : ''}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
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
    return Response.json(data);
  } catch (error) {
    console.error('Error in warehouse-stock adjustment-report excel API:', error);

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
