import { NextRequest } from 'next/server';

// PUT /api/demand-item/[id] - Rename / re-categorize a demand item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();
    const { id: itemId } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/demand-item/${itemId}`;

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
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to update demand item' },
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

// DELETE /api/demand-item/[id] - Delete a demand item (admin only, enforced server-side)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id: itemId } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/demand-item/${itemId}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to delete demand item' },
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
