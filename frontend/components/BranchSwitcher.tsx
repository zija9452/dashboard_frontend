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
  const [switching, setSwitching] = useState(false);
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
    if (!branch || target === branch.code) return;
    setSwitching(true);
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
        setSwitching(false);
        return;
      }
      // Full reload so no page keeps data from the previous branch
      window.location.reload();
    } catch (err) {
      console.error('Switch branch error:', err);
      setError('Switch branch failed');
      setSwitching(false);
    }
  };

  if (!branch) return null;

  return (
    <div className="flex items-center gap-2 mr-auto ml-14">
      <BuildingStorefrontIcon className="h-5 w-5 text-regal-orange" />
      {isAdmin && branches.length > 1 ? (
        <select
          className="py-1.5 pl-2 pr-8 text-sm font-semibold text-regal-black border border-regal-yellow/30 rounded-lg shadow-sm focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow bg-white cursor-pointer"
          value={branch.code}
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
    </div>
  );
};

export default BranchSwitcher;
