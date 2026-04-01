import { NextRequest } from 'next/server';

// GET /api/customer-category/[id] - Get single category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id: categoryId } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customer-category/${categoryId}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, {
        status: response.status,
      });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to fetch category' },
        { status: response.status }
      );
    }
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/customer-category/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();
    const { id: categoryId } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customer-category/${categoryId}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, {
        status: response.status,
      });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to update category' },
        { status: response.status }
      );
    }
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/customer-category/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id: categoryId } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customer-category/${categoryId}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers,
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, {
        status: response.status,
      });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to delete category' },
        { status: response.status }
      );
    }
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
