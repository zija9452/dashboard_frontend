'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface AttendanceEntry {
  salesman_id: string;
  name: string;
  branch: string;
  check_in_time?: string;
  check_out_time?: string;
}

interface AttendanceOverview {
  pending: AttendanceEntry[];
  active: AttendanceEntry[];
  completed: AttendanceEntry[];
  pending_count: number;
}

const POLL_INTERVAL_MS = 45000;

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SalesmanAttendanceWidget: React.FC = () => {
  const { showToast } = useToast();
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchOverview = useCallback(async (): Promise<AttendanceOverview | null> => {
    try {
      const response = await fetch('/api/salesman-attendance/today', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data: AttendanceOverview = await response.json();
        setOverview(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching salesman attendance:', error);
    }
    return null;
  }, []);

  // Poll for updates, and auto-open the popup once per day (per browser tab
  // session) the first time there is at least one pending check-in.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchOverview();
      if (cancelled || !data) return;

      const storageKey = `salesman_attendance_popup_shown_${todayKey()}`;
      let alreadyShown = true;
      try {
        alreadyShown = !!sessionStorage.getItem(storageKey);
      } catch {
        // sessionStorage unavailable (private mode etc.) - fall back to showing once per mount
        alreadyShown = false;
      }

      if (!alreadyShown && data.pending_count > 0) {
        setShowModal(true);
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch {
          // ignore - non-fatal if we can't persist the flag
        }
      }
    })();

    const interval = setInterval(fetchOverview, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchOverview]);

  const handleCheckIn = async (salesmanId: string, name: string) => {
    setActingId(salesmanId);
    try {
      const response = await fetch(`/api/salesman-attendance/${salesmanId}/check-in`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        showToast(`${name} checked in`, 'success');
        await fetchOverview();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to check in');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to check in', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleCheckOut = async (salesmanId: string, name: string) => {
    setActingId(salesmanId);
    try {
      const response = await fetch(`/api/salesman-attendance/${salesmanId}/check-out`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        showToast(`${name} checked out`, 'success');
        await fetchOverview();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to check out');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to check out', 'error');
    } finally {
      setActingId(null);
    }
  };

  if (!overview) return null;

  const pendingCount = overview.pending_count;
  const activeCount = overview.active.length;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
        title="Salesman Attendance"
      >
        <svg className="h-6 w-6 text-regal-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="hidden sm:inline text-sm font-medium text-regal-black">Salesman Attendance</span>
        {(pendingCount > 0 || activeCount > 0) && (
          <span className="absolute -top-1.5 -right-1.5 sm:static sm:ml-1 flex items-center gap-1">
            {pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-red-600 text-white text-xs font-bold"
                title="Not checked in yet"
              >
                {pendingCount}
              </span>
            )}
            {activeCount > 0 && (
              <span
                className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-green-600 text-white text-xs font-bold"
                title="Currently in - checkout due"
              >
                {activeCount}
              </span>
            )}
          </span>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-regal-black mb-1">Salesman Attendance - Today</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {pendingCount} pending &middot; {overview.active.length} currently in &middot; {overview.completed.length} completed
                </p>

                {overview.pending.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">
                      Not Checked In ({overview.pending.length})
                    </h4>
                    <div className="space-y-2">
                      {overview.pending.map((s) => (
                        <div key={s.salesman_id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-md px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-regal-black">{s.name}</p>
                            {s.branch && <p className="text-xs text-gray-500">{s.branch}</p>}
                          </div>
                          <button
                            onClick={() => handleCheckIn(s.salesman_id, s.name)}
                            disabled={actingId === s.salesman_id}
                            className="regal-btn text-sm py-1.5 px-3 disabled:opacity-50"
                          >
                            {actingId === s.salesman_id ? 'Saving...' : 'Check In'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overview.active.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">
                      Currently In ({overview.active.length})
                    </h4>
                    <div className="space-y-2">
                      {overview.active.map((s) => (
                        <div key={s.salesman_id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-md px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-regal-black">{s.name}</p>
                            <p className="text-xs text-gray-500">
                              {s.branch ? `${s.branch} · ` : ''}In at {formatTime(s.check_in_time)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCheckOut(s.salesman_id, s.name)}
                            disabled={actingId === s.salesman_id}
                            className="regal-btn bg-gray-200 hover:bg-gray-300 text-regal-black text-sm py-1.5 px-3 disabled:opacity-50"
                          >
                            {actingId === s.salesman_id ? 'Saving...' : 'Check Out'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overview.completed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Completed ({overview.completed.length})
                    </h4>
                    <div className="space-y-2">
                      {overview.completed.map((s) => (
                        <div key={s.salesman_id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-regal-black">{s.name}</p>
                            {s.branch && <p className="text-xs text-gray-500">{s.branch}</p>}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatTime(s.check_in_time)} &ndash; {formatTime(s.check_out_time)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overview.pending.length === 0 && overview.active.length === 0 && overview.completed.length === 0 && (
                  <p className="text-sm text-gray-500">No salesmen found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesmanAttendanceWidget;
