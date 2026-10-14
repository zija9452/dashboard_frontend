'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { branchSignalId, useBranch } from '@/lib/branch';
import { PAYMENT_PROOFS_CHANGED } from '@/lib/paymentMethods';

// Fired by the Payments Record page after a deposit submit / edit / approve / reject
export const CASH_DEPOSITS_CHANGED = 'cash-deposits-changed';

// Data lives on Neon - keep polling infrequent; the Firestore signal below is the
// instant path, this is only the fallback (like the shop order badges).
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface CashDepositBadgeProps {
  role: string | null;
}

/**
 * Sidebar count for Payments Record.
 * Sales/admin: deposits + online payments waiting for approval, and online payments
 * without a pay slip (the same rows the Pending list shows).
 * Cashier: rejected deposits + rejected online payments + online payments without a
 * pay slip; each stays until it is resubmitted (PENDING).
 * The count stays until the item is handled, and refreshes instantly on the
 * branch's Firestore signal (sales/admin: review signal, cashier: cashier signal).
 */
const CashDepositBadge: React.FC<CashDepositBadgeProps> = ({ role }) => {
  const [count, setCount] = useState(0);
  const isCashier = role === 'cashier';

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/payments-record/pending-count', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCount(
          isCashier
            ? (data.deposits_rejected || 0) + (data.proofs_rejected || 0) + (data.proofs_missing || 0) // same as the Rejected list
            : (data.deposits_pending || 0) + (data.proofs_pending || 0) + (data.proofs_missing || 0) // same as the Pending list
        );
      }
    } catch (error) {
      console.error('Error fetching payments record count:', error);
    }
  }, [isCashier]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    window.addEventListener(CASH_DEPOSITS_CHANGED, fetchCount);
    window.addEventListener(PAYMENT_PROOFS_CHANGED, fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener(CASH_DEPOSITS_CHANGED, fetchCount);
      window.removeEventListener(PAYMENT_PROOFS_CHANGED, fetchCount);
    };
  }, [fetchCount]);

  // Instant push from another user's action (new deposit / screenshot, approve, reject)
  const branch = useBranch();
  useEffect(() => {
    if (!branch || !role) return;
    const signal = isCashier ? 'payments_record_cashier' : 'payments_record_review';
    const unsubscribe = onSnapshot(doc(db, 'signals', branchSignalId(signal, branch.code)), () => fetchCount());
    return () => unsubscribe();
  }, [fetchCount, branch, role, isCashier]);

  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-white text-xs font-bold ml-2 ${
        isCashier ? 'bg-red-600' : 'bg-green-600'
      }`}
      title={isCashier ? 'Rejected deposits / payments, or payments without pay slip' : 'Deposits and online payments awaiting approval'}
    >
      {count}
    </span>
  );
};

export default CashDepositBadge;
