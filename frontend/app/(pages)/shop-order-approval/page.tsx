'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface ApprovalOrder {
  id: string;
  product_name: string;
  barcode: string;
  category: string;
  quantity_ordered: number;
  note: string;
  current_stock: number;
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';

const statusLabel = (status: string) => status.replace('_', ' ');

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-lime-200 text-lime-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const rowColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-lime-100 hover:bg-lime-100',
  APPROVED: 'bg-green-50 hover:bg-green-100',
  REJECTED: 'bg-red-50 hover:bg-red-100',
};

const formatDateOnly = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const ShopOrderApprovalPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<ApprovalFilter>(
    (searchParams.get('filter') as ApprovalFilter) || 'pending'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [orders, setOrders] = useState<ApprovalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Right-side details panel
  const [selectedOrder, setSelectedOrder] = useState<ApprovalOrder | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('filter', filter);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('search_string', searchTerm);

      const response = await fetch(`/api/shoporder/approval/list?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data || []);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.total_pages || 0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch orders', 'error');
      }
    } catch (error) {
      console.error('Error fetching approval orders:', error);
      showToast('Error fetching orders', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Viewing this page clears the sidebar notification badge immediately,
  // instead of waiting for its next poll (the sidebar stays mounted across
  // page navigation, so it needs to be told rather than re-fetching itself).
  useEffect(() => {
    fetch('/api/shoporder/approval/mark-seen', {
      method: 'POST',
      credentials: 'include',
    })
      .then(() => window.dispatchEvent(new Event('shop-order-approval-reviewed')))
      .catch((error) => console.error('Error marking approvals seen:', error));
  }, []);

  const handleFilterChange = (newFilter: ApprovalFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    router.replace(`/shop-order-approval?filter=${newFilter}`);
  };

  const openOrderDetails = (order: ApprovalOrder) => {
    setSelectedOrder(order);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    // Fully unmount the overlay after the slide-out transition finishes,
    // otherwise the fullscreen wrapper stays mounted (invisible) and blocks
    // clicks on the rest of the page until a refresh.
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleReview = async (order: ApprovalOrder, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      const result = await Swal.fire({
        title: 'Reject this order?',
        text: `${order.quantity_ordered} unit(s) of ${order.product_name}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, reject it',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
    }

    setReviewing(true);
    try {
      const response = await fetch(`/api/shoporder/approval/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        Swal.fire({
          title: action === 'approve' ? 'Approved!' : 'Rejected!',
          icon: 'success',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        closePanel();
        fetchOrders();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || `Failed to ${action} order`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      showToast(`Error ${action}ing order`, 'error');
    } finally {
      setReviewing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Shop Order Approval" />

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>

          {showSearch && (
            <div className="flex gap-2 mt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by product or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setCurrentPage(1);
                    }
                  }}
                  className="regal-input w-full pl-10 pr-4 py-4"
                  autoFocus
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value as ApprovalFilter)}
                className="regal-input w-32"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="border-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">S.No</th>
                  <th className="px-3 py-5 text-left w-48">Product Name</th>
                  <th className="px-3 py-5 text-center w-24">Current Stock</th>
                  <th className="px-3 py-5 text-left w-32">Barcode</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-left w-20">Qty</th>
                  <th className="px-3 py-5 text-left w-28">Note</th>
                  <th className="px-3 py-5 text-center w-40">Status</th>
                  <th className="px-3 py-5 text-left w-32">Requested</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrderDetails(order)}
                    className={`text-sm text-gray-900 transition-colors cursor-pointer ${
                      rowColors[order.approval_status] || 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4 font-medium">{order.product_name}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={order.current_stock <= 0 ? 'text-red-600 font-semibold' : 'text-yellow-700 font-semibold'}>
                        {order.current_stock}
                      </span>
                    </td>
                    <td className="px-3 py-4">{order.barcode || '-'}</td>
                    <td className="px-3 py-4">{order.category || 'N/A'}</td>
                    <td className="px-3 py-4">{order.quantity_ordered}</td>
                    <td className="px-3 py-4 truncate" title={order.note || undefined}>{order.note || '-'}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[order.approval_status]}`}>
                        {statusLabel(order.approval_status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">{formatDateOnly(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <p className="text-center py-12 text-gray-500">
                {filter === 'pending' && 'No orders awaiting approval'}
                {filter === 'approved' && 'No approved orders'}
                {filter === 'rejected' && 'No rejected orders'}
                {filter === 'all' && 'No shop order requests found'}
              </p>
            )}
          </div>

          {totalPagesFromApi > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesFromApi}
                totalItems={totalItems}
                pageSize={pageSize}
                baseUrl="/shop-order-approval"
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Right-side order details panel */}
      {selectedOrder && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${
            isPanelOpen ? '' : 'pointer-events-none'
          }`}
        >
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              isPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closePanel}
          ></div>

          <div
            className={`relative w-full sm:w-2/5 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Order Details</h2>
              <button
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Product Name</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Barcode</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.barcode || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.category || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Current Stock</span>
                <span className={`text-sm font-semibold ${selectedOrder.current_stock <= 0 ? 'text-red-600' : 'text-yellow-700'}`}>
                  {selectedOrder.current_stock}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Quantity Ordered</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.quantity_ordered}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Note</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.note || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[selectedOrder.approval_status]}`}>
                  {statusLabel(selectedOrder.approval_status)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Requested Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.created_at)}</span>
              </div>
              {selectedOrder.approval_status === 'APPROVED' && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">Approved On</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.approved_at)}</span>
                </div>
              )}
              {selectedOrder.approval_status === 'REJECTED' && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">Rejected On</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.rejected_at)}</span>
                </div>
              )}

              {selectedOrder.approval_status === 'PENDING_APPROVAL' && (
                <div className="pt-4 flex gap-2">
                  <button
                    onClick={() => handleReview(selectedOrder, 'approve')}
                    disabled={reviewing}
                    className="regal-btn bg-green-500 text-white flex-1 py-2 disabled:opacity-50"
                  >
                    {reviewing ? 'Please wait...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReview(selectedOrder, 'reject')}
                    disabled={reviewing}
                    className="regal-btn bg-red-500 text-white flex-1 py-2 disabled:opacity-50"
                  >
                    {reviewing ? 'Please wait...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOrderApprovalPage;
