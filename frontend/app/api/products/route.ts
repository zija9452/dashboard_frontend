import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Default: view products with backend pagination
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '8';  // 8 items per page
    const search_string = url.searchParams.get('search_string') || '';
    const branches = url.searchParams.get('branches') || '';
    const warehouse = url.searchParams.get('warehouse') || '';  // Filter for warehouse products

    const cookieHeader = request.headers.get('cookie') || '';

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search_string) params.append('search_string', search_string);
    if (branches) params.append('branches', branches);
    if (warehouse) params.append('warehouse', warehouse);  // Pass warehouse filter to backend

    const queryString = params.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/viewproduct${queryString ? '?' + queryString : ''}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(120000), // 2 minute timeout
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
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error in products API:', error);

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

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    // Determine if this is a product creation or view-product request
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    let backendUrl: string;

    if (action === 'create') {
      // Create new product
      backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/`;
    } else {
      // Default: view products (for backward compatibility) - updated endpoint
      backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/viewproduct`;
    }

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
      console.error('Backend error response:', errorText);
      
      let errorMessage = 'Backend request failed';
      let errorDetail = null;
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed error data:', errorData);
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        errorDetail = errorData;
      } catch (parseError) {
        console.error('Failed to parse error JSON:', parseError);
        errorMessage = errorText || errorMessage;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          detail: errorDetail,
          status: response.status 
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error in products POST API:', error);

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
