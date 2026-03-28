import { NextRequest } from 'next/server';

// POST /api/products/delete-image - Delete product image from Cloudinary
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    // Get request body
    const body = await request.json();
    const { image_url, public_id, product_id } = body;

    if (!image_url && !public_id) {
      return Response.json(
        { error: 'image_url or public_id is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products/delete-image`;

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
      signal: AbortSignal.timeout(60000), // 1 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to delete image';
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
    console.error('Error deleting image:', error);

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
