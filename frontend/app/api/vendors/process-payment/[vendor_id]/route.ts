import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendor_id: string }> }
) {
  try {
    // Unwrap params (it's a Promise in Next.js 15+)
    const { vendor_id } = await params;
    const paymentData = await request.json();

    // Get cookies from request
    const cookieHeader = request.headers.get('cookie') || '';

    // Forward the payment request to the backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/vendors/process-payment/${vendor_id}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward cookies to backend
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify(paymentData),
    });

    if (backendResponse.ok) {
      const result = await backendResponse.json();
      return NextResponse.json(result);
    } else {
      const errorText = await backendResponse.text();
      let errorMessage = 'Failed to process payment';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Vendor payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
