import { NextRequest } from 'next/server';
import { proxyCashDeposits } from '../../proxy';

// POST /api/cash-deposits/[id]/approve
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyCashDeposits(request, `${encodeURIComponent(id)}/approve`, 'POST');
}
