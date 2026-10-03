'use client';

import React, { useCallback, useEffect, useState } from 'react';

// Fired by the Cash Deposits page after submit / edit / approve / reject
export const CASH_DEPOSITS_CHANGED = 'cash-deposits-changed';

interface CashDepositBadgeProps {
  role: string | null;
}

/**
 * Sidebar count for Cash Deposits. Sales/admin: deposits waiting for approval.
 * Cashier: own rejected deposits to fix. No polling (keeps Neon compute low):
 * loads once and refreshes when the Cash Deposits page changes something.
 */
const CashDepositBadge: React.FC<CashDepositBadgeProps> = ({ role }) => {
  const [count, setCount] = useState(0);
  const isCashier = role === 'cashier';

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/cash-deposits/pending-count', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCount((isCashier ? data.rejected : data.pending) || 0);
      }
    } catch (error) {
      console.error('Error fetching cash deposit count:', error);
    }
  }, [isCashier]);

  useEffect(() => {
    fetchCount();
    window.addEventListener(CASH_DEPOSITS_CHANGED, fetchCount);
    return () => window.removeEventListener(CASH_DEPOSITS_CHANGED, fetchCount);
  }, [fetchCount]);

  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-white text-xs font-bold ml-2 ${
        isCashier ? 'bg-red-600' : 'bg-green-600'
      }`}
      title={isCashier ? 'Rejected deposits to fix' : 'Deposits awaiting approval'}
    >
      {count}
    </span>
  );
};

export default CashDepositBadge;
