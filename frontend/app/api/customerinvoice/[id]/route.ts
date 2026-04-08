import { NextRequest } from 'next/server';

// GET /api/customerinvoice/[id] - Get single invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customerinvoice/Getorder/${id}`;

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

      // Transform backend response to frontend format
      const invoice = {
        id: data.orderid,
        invoice_no: data.invoice_no || 'N/A',
        customer_name: data.fields?.customer_name || '',
        team_name: data.team_name || '',
        total_amount: data.fields?.totals?.total || 0,
        amount_paid: data.fields?.totals?.amount_paid || 0,
        balance_due: data.fields?.totals?.balance_due || 0,
        payment_status: data.fields?.totals?.payment_status || 'unpaid',
        payment_method: data.fields?.payment_method || 'cash',
        status: data.status,
        created_at: new Date().toISOString(),
        items: data.fields?.items || []
      };

      return Response.json(invoice, {
        status: response.status,
      });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || 'Failed to fetch invoice' },
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

// DELETE /api/customerinvoice/[id] - Delete invoice by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { id } = await params;

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/customerinvoice/Deletecustomorder/${id}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',  // Backend uses POST for delete
      headers,
      cache: 'no-store'
    });

    if (response.ok) {
      return Response.json({ success: true }, { status: 200 });
    } else {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.detail || errorData.error || 'Failed to delete order' },
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
