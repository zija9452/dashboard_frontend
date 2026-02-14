import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Extract the path and query parameters
    const url = new URL(request.url);
    
    // Get all cookies to forward authentication
    const cookieStore = cookies();
    const allCookies: string[] = [];
    cookieStore.getAll().forEach(cookie => {
      allCookies.push(`${cookie.name}=${cookie.value}`);
    });
    const cookieHeader = allCookies.join('; ');

    // Test the backend connection
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/admin/viewadmins`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    console.log('Testing backend connection to:', backendUrl);
    console.log('Sending cookies:', cookieHeader);

    // Forward the GET request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    console.log('Backend response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    console.log('Backend response content-type:', contentType);

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Backend response data:', data);
      
      return Response.json({
        success: true,
        status: response.status,
        data: data,
        message: 'Connection successful'
      });
    } else {
      // If not JSON, return the raw text
      const text = await response.text();
      console.log('Backend response text (non-JSON):', text);
      
      return Response.json({
        success: false,
        status: response.status,
        error: 'Backend returned non-JSON response',
        details: text.substring(0, 500) // Limit the response size
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Error testing backend connection:', error);
    return Response.json({
      success: false,
      error: 'Connection failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}