import { NextRequest } from 'next/server';
import { proxyCashDeposits } from '../proxy';

type Params = { params: Promise<{ id: string }> };

// GET /api/cash-deposits/[id] - Deposit + slips
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyCashDeposits(request, encodeURIComponent(id), 'GET');
}

// PUT /api/cash-deposits/[id] - Edit / resubmit (multipart)
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyCashDeposits(request, encodeURIComponent(id), 'PUT', 'multipart');
}
