import { NextRequest } from 'next/server';

// GET /api/duplicatebill/[invoice_id]/duplicate - Get duplicate invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { invoice_id: string } }
) {
  try {
    const { invoice_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const invoice_type = searchParams.get('invoice_type') || '';

    if (!invoice_type) {
      return Response.json(
        { error: 'invoice_type query parameter is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/duplicatebill/${invoice_id}/duplicate?invoice_type=${invoice_type}`;

    const cookieHeader = request.headers.get('cookie') || '';

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
    console.error('Error fetching duplicate invoice:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
