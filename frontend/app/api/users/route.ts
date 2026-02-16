import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const searchString = url.searchParams.get('search_string') || '';
    const skip = url.searchParams.get('skip') || '0';
    const limit = url.searchParams.get('limit') || '100';

    // Get all cookies to forward authentication
    // Access cookies from the request headers directly
    const cookieHeader = request.headers.get('cookie') || '';

    // Construct the backend API URL with all query parameters
    const params = new URLSearchParams();
    if (searchString) params.append('search_string', searchString);
    params.append('skip', skip);
    params.append('limit', limit);
    
    const queryString = params.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${queryString ? '?' + queryString : ''}`;

    console.log('Forwarding request to backend:', backendUrl);
    console.log('Cookies being sent:', cookieHeader);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Forward the GET request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store' // Prevent caching issues
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    // Check if the response is JSON or HTML
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);

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
        {
          error: 'Backend returned non-JSON response',
          details: text,
          backendUrl: backendUrl,
          status: response.status
        },
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