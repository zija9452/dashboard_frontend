import { NextRequest } from 'next/server';
import { proxyCashDeposits } from '../proxy';

// GET /api/cash-deposits/pending-count - { pending, rejected }
export async function GET(request: NextRequest) {
  return proxyCashDeposits(request, 'pending-count', 'GET');
}
