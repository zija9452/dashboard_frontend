'use client';

import React, { useEffect, useState } from 'react';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { Branch, useBranch } from '@/lib/branch';

interface BranchSwitcherProps {
  userRole: string | null;
}

// Top bar: shows the logged-in branch; admin can switch to another branch.
// ml-14 keeps it clear of the fixed PageHamburgerButton.
const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ userRole }) => {
  const branch = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  // Branch being switched to - shows the loading overlay until the page reloads
  const [switchingTo, setSwitchingTo] = useState<Branch | null>(null);
  const switching = switchingTo !== null;
  const [error, setError] = useState('');

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/auth/branches');
        if (response.ok) {
          setBranches(await response.json());
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };

    fetchBranches();
  }, [isAdmin]);

  const handleSwitch = async (target: string) => {
    if (!branch || target === branch.code || switching) return;
    setSwitchingTo(branches.find(b => b.code === target) || { code: target, name: target });
    setError('');
    try {
      const response = await fetch('/api/auth/switch-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ branch: target }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Switch branch failed');
        setSwitchingTo(null);
        return;
      }
      // Full reload so no page keeps data from the previous branch. The overlay
      // stays up (switchingTo is not cleared) until the new page replaces this one.
      window.location.reload();
    } catch (err) {
      console.error('Switch branch error:', err);
      setError('Switch branch failed');
      setSwitchingTo(null);
    }
  };

  if (!branch) return null;

  return (
    <div className="flex items-center gap-2 mr-auto ml-14">
      <BuildingStorefrontIcon className="h-5 w-5 text-regal-orange" />
      {isAdmin && branches.length > 1 ? (
        <select
          className="py-1.5 pl-2 pr-8 text-sm font-semibold text-regal-black border border-regal-yellow/30 rounded-lg shadow-sm focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow bg-white cursor-pointer"
          value={switchingTo?.code ?? branch.code}
          onChange={(e) => handleSwitch(e.target.value)}
          disabled={switching}
          title="Switch branch"
        >
          {branches.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      ) : (
        <span className="text-sm font-semibold text-regal-black">{branch.name}</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}

      {/* Same blurred loading overlay as the other pages (e.g. Quotation PDF) - blocks
          clicks while the branch changes and the page reloads. */}
      {switchingTo && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]" role="status" aria-live="polite">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-regal-orange" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-regal-black font-medium">Switching to {switchingTo.name}...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
