import { NextRequest } from 'next/server';

// DELETE /api/expense-type/[id] - Delete an expense type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/expense-type/${id}`;

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
    console.error('Error deleting expense type:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/expense-type/[id] - Update an expense type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();
    const { id } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/expense-type/${id}`;

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
    console.error('Error updating expense type:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
