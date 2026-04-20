'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface RefundRecord {
  refund_id: string;
  invoice_id: string;
  invoice_no: string;
  product_name: string;
  quantity_returned: number;
  refund_amount: number;
  reason: string;
  created_at: string;
  updated_at: string;
}

const RefundRecordsPage: React.FC = () => {
  const { showToast } = useToast();

  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRefund, setEditingRefund] = useState<RefundRecord | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);
  const totalPages = totalPagesFromApi;

  // Fetch refunded items for selected date
  const fetchRefundRecords = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/refunds/walkin-invoice?date=${selectedDate}&limit=${pageSize}&skip=${(currentPage - 1) * pageSize}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        // Handle paginated response format: { data: [...], page, limit, total, totalPages, has_more }
        const data = result.data || [];
        const total = result.total || 0;
        const totalPagesApi = result.total_pages || Math.ceil(total / pageSize);
        setTotalItems(total);
        setTotalPagesFromApi(totalPagesApi);

        // Transform data to include serial numbers
        const records: RefundRecord[] = data.map((refund: any, index: number) => {
          // Parse refund items
          const refundItems = refund.refunded_items || [];
          const productName = refundItems[0]?.product_name || 'N/A';
          const quantityReturned = refundItems[0]?.quantity_returned || 0;

          return {
            refund_id: refund.refund_id,
            invoice_id: refund.invoice_id,
            invoice_no: refund.invoice_no || 'N/A',
            product_name: productName,
            quantity_returned: quantityReturned,
            refund_amount: refund.refund_amount,
            reason: refund.refund_reason || 'Customer return',
            created_at: refund.created_at,
            updated_at: refund.updated_at,
            serial_number: index + 1
          };
        });

        setRefundRecords(records);
      } else {
        showToast('Failed to fetch refund records', 'error');
      }
    } catch (error) {
      console.error('Error fetching refund records:', error);
      showToast('Error fetching refund records', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (refund: RefundRecord) => {
    setEditingRefund(refund);
    setEditDate(refund.created_at.split('T')[0]);
    setShowEditModal(true);
  };

  // Update refund date
  const handleUpdateRefundDate = async () => {
    if (!editingRefund || !editDate) {
      showToast('Please select a date', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Convert date to ISO string without timezone (YYYY-MM-DDTHH:MM:SS format)
      const naiveDatetime = new Date(editDate);
      const naiveDatetimeStr = naiveDatetime.toISOString().replace('Z', '');

      const response = await fetch(`/api/refunds/walkin-invoice/${editingRefund.refund_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          created_at: naiveDatetimeStr
        }),
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Refund date updated successfully',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        setShowEditModal(false);
        setEditingRefund(null);
        fetchRefundRecords(); // Refresh list
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || errorData.error || 'Failed to update refund date', 'error');
      }
    } catch (error) {
      console.error('Error updating refund date:', error);
      showToast('Error updating refund date', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRefundRecords();
  }, [selectedDate, currentPage]);

  return (
    <div className="p-4">
      <PageHeader title="Refund Records" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Date filter */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Select Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="regal-input w-40"
          />
         
        </div>

        {/* Back to Refund button */}
        <div className="w-full sm:w-auto">
          <a
            href="/refund"
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            ← Back to Refund
          </a>
        </div>
      </div>

      {/* Refund Records Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : refundRecords.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-gray-500">No refund records found for {selectedDate}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">#</th>
                  <th className="px-3 py-5 text-left w-28">Invoice No</th>
                  <th className="px-3 py-5 text-left w-40">Product</th>
                  <th className="px-3 py-5 text-left w-20">Quantity</th>
                  <th className="px-3 py-5 text-left w-28">Refund Amount</th>
                  <th className="px-3 py-5 text-left w-40">Reason</th>
                  <th className="px-3 py-5 text-left w-32">Date</th>
                  <th className="px-3 py-5 text-left w-24">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {refundRecords.map((record, index) => (
                  <tr key={record.refund_id} className="hover:bg-gray-50 text-sm text-gray-900 transition-colors">
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {record.invoice_no}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <span className="font-medium">{record.product_name}</span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-gray-900">
                      {record.quantity_returned}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      Rs. {record.refund_amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {record.reason}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => handleEditClick(record)}
                        className="regal-btn bg-regal-yellow text-regal-black px-3 py-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/refund-records"
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Edit Refund Date</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund ID
                </label>
                <input
                  type="text"
                  value={editingRefund.refund_id.substring(0, 8) + '...'}
                  disabled
                  className="regal-input w-full bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice No
                </label>
                <input
                  type="text"
                  value={editingRefund.invoice_no}
                  disabled
                  className="regal-input w-full bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <input
                  type="text"
                  value={editingRefund.product_name}
                  disabled
                  className="regal-input w-full bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="regal-input w-full"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRefund(null);
                  }}
                  disabled={submitting}
                  className={`regal-btn bg-gray-300 text-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRefundDate}
                  disabled={submitting}
                  className={`regal-btn bg-regal-yellow text-regal-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Update Date'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRecordsPage;
