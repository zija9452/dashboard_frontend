import { NextRequest } from 'next/server';
import { proxyBackend } from '../proxy';

type Params = { params: Promise<{ path: string[] }> };

const backendPath = async ({ params }: Params) =>
  `payment-proofs/${(await params).path.map(encodeURIComponent).join('/')}`;

// /api/payment-proofs/counts, /by-invoice/[id], /[id], /[id]/images, /[id]/approve, /[id]/reject
export async function GET(request: NextRequest, ctx: Params) {
  return proxyBackend(request, await backendPath(ctx), 'GET');
}

export async function PUT(request: NextRequest, ctx: Params) {
  return proxyBackend(request, await backendPath(ctx), 'PUT');
}

export async function POST(request: NextRequest, ctx: Params) {
  return proxyBackend(request, await backendPath(ctx), 'POST');
}
