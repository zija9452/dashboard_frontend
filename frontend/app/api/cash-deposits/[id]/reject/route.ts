import { NextRequest } from 'next/server';
import { proxyCashDeposits } from '../../proxy';

// POST /api/cash-deposits/[id]/reject - body { reason }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyCashDeposits(request, `${encodeURIComponent(id)}/reject`, 'POST', 'json');
}
