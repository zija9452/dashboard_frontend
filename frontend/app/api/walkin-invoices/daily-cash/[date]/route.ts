import { NextRequest } from 'next/server';

// GET /api/walkin-invoices/daily-cash/[date] - Get daily cash record
export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { date } = await params;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/walkin-invoice/daily-cash/${date}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: errorText || 'Backend request failed', found: false },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching daily cash:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error), found: false },
      { status: 500 }
    );
  }
}
