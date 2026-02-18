import { NextRequest } from 'next/server';

// In-memory cache for products (5 minute validity)
interface ProductsCache {
  data: any[];
  timestamp: number;
  search_string: string;
  skip: number;
  limit: number;
}

const productsCache: ProductsCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this is a barcode generation request
    if (pathname.endsWith('/generate-barcode')) {
      const cookieHeader = request.headers.get('cookie') || '';
      const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/generate-barcode`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const response = await fetch(backendUrl, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      return Response.json(data, {
        status: response.status,
      });
    }

    // Default: view products
    const skip = url.searchParams.get('skip') || '0';
    const limit = url.searchParams.get('limit') || '100';
    const search_string = url.searchParams.get('search_string') || '';

    const cookieHeader = request.headers.get('cookie') || '';

    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (search_string) params.append('search_string', search_string);

    const queryString = params.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/view-product${queryString ? '?' + queryString : ''}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error in products API:', error);
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
      // Default: view products (for backward compatibility)
      backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/view-product`;
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
