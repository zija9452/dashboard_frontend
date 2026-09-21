'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Shop order data lives on Neon - keep polling infrequent so the badge
// doesn't burn extra queries against it while an admin is just logged in.
const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const ShopOrderApprovalBadge: React.FC = () => {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/shoporder/approval/count', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching shop order approval count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Instant push the moment a new order is placed by anyone, instead of
  // waiting for the next poll - the interval above stays as a fallback in
  // case the Firestore listener ever misses an update (e.g. offline tab).
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'signals', 'shop_order_approval'), () => fetchCount());
    return () => unsubscribe();
  }, [fetchCount]);

  // The approval page marks everything seen as soon as it's opened - clear
  // the badge immediately instead of waiting for the next poll, since the
  // sidebar stays mounted across page navigation.
  useEffect(() => {
    const handleReviewed = () => setCount(0);
    window.addEventListener('shop-order-approval-reviewed', handleReviewed);
    return () => window.removeEventListener('shop-order-approval-reviewed', handleReviewed);
  }, []);

  if (count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-green-600 text-white text-xs font-bold ml-2"
      title="New orders awaiting approval"
    >
      {count}
    </span>
  );
};

export default ShopOrderApprovalBadge;
