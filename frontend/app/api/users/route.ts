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
    const cookieHeader = request.headers.get('cookie') || '';

    // Construct the backend API URL with all query parameters
    const params = new URLSearchParams();
    if (searchString) params.append('search_string', searchString);
    params.append('skip', skip);
    params.append('limit', limit);

    const queryString = params.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${queryString ? '?' + queryString : ''}`;

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
      cache: 'no-store'
    });

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return Response.json(data, {
        status: response.status,
      });
    } else {
      const text = await response.text();
      return Response.json(
        {
          error: 'Backend returned non-JSON response',
          details: text,
          status: response.status
        },
        { status: response.status || 500 }
      );
    }
  } catch (error) {
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

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/`;

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