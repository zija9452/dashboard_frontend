import { NextRequest } from 'next/server';

// Saves many ideal prices of one category in one request (Ideal Pricing "Save All").
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/ideal-pricing/bulk`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const data = await response.json();
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
