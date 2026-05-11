import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const searchParams = request.nextUrl.searchParams;
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/warehouse-salesview/sales-view/excel?from_date=${from_date}&to_date=${to_date}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const response = await fetch(backendUrl, { method: 'GET', headers, cache: 'no-store' });
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
