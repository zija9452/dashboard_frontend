import { NextRequest } from 'next/server';

// POST /api/quotation/[id]/status - Change quotation status (SENT/APPROVED/REJECTED/DRAFT)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id } = await params;
    const body = await request.json();

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/quotation/${id}/status`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
