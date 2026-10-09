import { NextRequest } from 'next/server';
import { proxyBackend } from '../../payment-proofs/proxy';

type Params = { params: Promise<{ path?: string[] }> };

// /api/payments-record (list) and /api/payments-record/pending-count
export async function GET(request: NextRequest, { params }: Params) {
  const path = (await params).path || [];
  return proxyBackend(request, `payments-record/${path.map(encodeURIComponent).join('/')}`, 'GET');
}
