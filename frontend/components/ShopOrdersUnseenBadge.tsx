'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Shop order data lives on Neon - keep polling infrequent so the badge
// doesn't burn extra queries against it while someone is just logged in.
const POLL_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

const ShopOrdersUnseenBadge: React.FC = () => {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/shoporder/unseen-count', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching shop orders unseen count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Instant push the moment an order gets approved by anyone, instead of
  // waiting for the next poll - the interval above stays as a fallback in
  // case the Firestore listener ever misses an update (e.g. offline tab).
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'signals', 'shop_order_updates'), () => fetchCount());
    return () => unsubscribe();
  }, [fetchCount]);

  if (count <= 0) return null;

  return (
    <span
      className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-green-600 text-white text-xs font-bold"
      title="Newly approved shop orders"
    >
      {count}
    </span>
  );
};

export default ShopOrdersUnseenBadge;
