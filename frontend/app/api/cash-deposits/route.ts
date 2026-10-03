import { NextRequest } from 'next/server';
import { proxyCashDeposits } from './proxy';

// GET /api/cash-deposits - List (status_filter, from_date, to_date, page, limit)
export async function GET(request: NextRequest) {
  return proxyCashDeposits(request, '', 'GET');
}

// POST /api/cash-deposits - Submit deposit (multipart: fields + slip images)
export async function POST(request: NextRequest) {
  return proxyCashDeposits(request, '', 'POST', 'multipart');
}
