import { NextRequest } from 'next/server';

// POST /api/customerinvoice/Customers - Create customer
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customerinvoice/Customers`;

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
      cache: 'no-store',
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!response.ok) {
  const errorText = await response.text();
  
  let errorMessage = 'Please Fill all required fields';
  
  try {
    const errorData = JSON.parse(errorText);
    
    // Priority order: detail > message > error > first validation error
    if (errorData?.error?.message) {
      errorMessage = errorData?.error?.message
    } else if (errorData?.detail) {
      // "HTTP Error 400: " prefix clean karein
      errorMessage = errorData.message.replace(/^HTTP Error \d+: /i, '').trim();
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if (Array.isArray(errorData?.errors)) {
      errorMessage = errorData.errors[0];
    }
  } catch (parseErr) {
    // Agar JSON parse nahi hua (HTML error page, etc.)
    console.warn('⚠️ Could not parse error response as JSON');
    errorMessage = errorText?.substring(0, 200) || 'Server returned an error';
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
    console.error('Error creating customer:', error);
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return Response.json(
        { error: 'Request timeout. Please try again.', type: 'TIMEOUT' },
        { status: 504 }
      );
    }
    
    // Handle other errors
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
