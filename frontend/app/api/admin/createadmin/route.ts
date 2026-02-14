import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get all cookies to forward authentication
    // Access cookies from the request headers directly
    const cookieHeader = request.headers.get('cookie') || '';

    // Get the JSON body from the request
    const body = await request.json();

    // Construct the backend API URL
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/admin/createadmin`;

    console.log('Forwarding request to backend:', backendUrl);
    console.log('Cookies being sent:', cookieHeader);
    console.log('Request body:', body);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Forward the POST request to the backend with JSON body
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    // Check if the response is JSON or HTML
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Backend response data:', data);
      return Response.json(data, {
        status: response.status,
      });
    } else {
      // If not JSON, return an error
      const text = await response.text();
      console.error('Non-JSON response from backend:', text);
      return Response.json(
        { error: 'Backend returned non-JSON response', details: text },
        { status: response.status || 500 }
      );
    }
  } catch (error) {
    console.error('Error forwarding request to backend:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}