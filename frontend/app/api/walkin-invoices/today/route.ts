import { NextRequest } from 'next/server';

// GET /api/walkin-invoices/today - Get today's walk-in invoices with payment method breakdown
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Use the backend's date endpoint (router prefix is /walkin-invoice, route is /date/{date})
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/walkin-invoice/date/${date}`;

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
        { error: errorText || 'Backend request failed', total_amount: 0, cash_amount: 0, invoices: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Backend returns total_amount, we need to calculate cash_amount
    // For now, return what backend gives us
    return Response.json({
      total_amount: data.total_amount || 0,
      cash_amount: data.cash_amount || 0,
      invoices: data.invoices || []
    });
  } catch (error) {
    console.error('Error fetching today invoices:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error), total_amount: 0, cash_amount: 0, invoices: [] },
      { status: 500 }
    );
  }
}
