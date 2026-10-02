'use client';

import { useEffect, useState } from 'react';

export interface Branch {
  code: string;
  name: string;
}

// Light House keeps the original Firestore signal ids; other branches get
// their own doc (mirrors branch_signal_id() in backend utils/firestore_signals.py).
const DEFAULT_BRANCH = 'lighthouse';

export const branchSignalId = (signalId: string, branchCode: string): string =>
  branchCode === DEFAULT_BRANCH ? signalId : `${signalId}__${branchCode}`;

// Several components mount together (top bar, badges); share one session
// request between them, but only briefly so a new login is never served a
// previous branch.
const CACHE_MS = 10 * 1000;
let pending: Promise<Branch | null> | null = null;
let pendingAt = 0;

export const fetchCurrentBranch = (): Promise<Branch | null> => {
  if (pending && Date.now() - pendingAt < CACHE_MS) {
    return pending;
  }
  pendingAt = Date.now();
  pending = fetch('/api/auth/session', { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      return data.user?.branch || null;
    })
    .catch((error) => {
      console.error('Error fetching current branch:', error);
      return null;
    });
  return pending;
};

// Current logged-in branch, or null while loading / when not logged in
export const useBranch = (): Branch | null => {
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    let active = true;
    fetchCurrentBranch().then((result) => {
      if (active) setBranch(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return branch;
};
