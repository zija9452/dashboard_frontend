'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';

type AttendanceStatus = 'COMPLETED' | 'IN_PROGRESS' | 'MISSED_CHECKOUT';

interface AttendanceRecord {
  id: string;
  salesman_id: string;
  name: string;
  branch: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: AttendanceStatus;
}

const STATUS_META: Record<AttendanceStatus, { label: string; className: string }> = {
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'Currently In', className: 'bg-green-100 text-green-700' },
  MISSED_CHECKOUT: { label: 'Missed Checkout', className: 'bg-red-100 text-red-700' },
};

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SalesmanAttendanceHistoryPage: React.FC = () => {
  const { showToast } = useToast();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const fetchHistory = useCallback(async (page: number) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('skip', ((page - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('search', searchTerm);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`/api/salesman-attendance/history?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.data || []);
        setTotalItems(data.total || 0);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch attendance history');
      }
    } catch (error: any) {
      console.error('Error fetching attendance history:', error);
      showToast(error.message || 'Failed to fetch attendance history', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo, pageSize, showToast]);

  // Auto-fetch once on mount, defaulting to today's date - same flow as Sales View
  useEffect(() => {
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetch = () => {
    setCurrentPage(1);
    fetchHistory(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHistory(page);
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Salesman Attendance History" />

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="regal-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="regal-input"
            />
          </div>
          <button
            className="regal-btn whitespace-nowrap disabled:opacity-50"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        <div className="w-full sm:w-auto">
          <input
            id="attendanceSearchInput"
            type="text"
            placeholder="Search salesman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
            className="regal-input w-full"
          />
        </div>
      </div>

      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100 border-b">
                <tr className='text-xs text-gray-900 uppercase tracking-wider font-semibold'>
                  <th className="px-4 py-5 text-left w-28">Date</th>
                  <th className="px-4 py-5 text-left w-40">Salesman</th>
                  <th className="px-4 py-5 text-left w-32">Branch</th>
                  <th className="px-4 py-5 text-left w-28">Check In</th>
                  <th className="px-4 py-5 text-left w-28">Check Out</th>
                  <th className="px-4 py-5 text-left w-36">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => {
                  const statusMeta = STATUS_META[record.status];
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 text-sm">
                      <td className="px-4 py-4 whitespace-nowrap">{formatDate(record.attendance_date)}</td>
                      <td className="px-4 py-4">{record.name}</td>
                      <td className="px-4 py-4">{record.branch || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatTime(record.check_in_time)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatTime(record.check_out_time)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/salesman-attendance"
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default SalesmanAttendanceHistoryPage;
