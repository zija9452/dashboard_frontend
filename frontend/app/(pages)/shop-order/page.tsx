'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface ShopOrder {
  id: string;
  product_name: string;
  barcode: string;
  category: string;
  quantity_ordered: number;
  note: string;
  current_stock: number;
  status: 'PENDING' | 'IN_PRODUCTION' | 'DELIVERED' | 'CANCEL';
  created_at: string;
  in_production_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

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

const formatDateOnly = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const statusLabel = (status: string) => status.replace('_', ' ');

const ShopOrderPage: React.FC = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Right-side details panel
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-lime-200 text-lime-800',
    IN_PRODUCTION: 'bg-amber-100 text-amber-800',
    DELIVERED: 'bg-blue-100 text-blue-800',
    CANCEL: 'bg-red-100 text-red-800',
  };

  const rowColors: Record<string, string> = {
    PENDING: 'bg-lime-100 hover:bg-lime-100',
    IN_PRODUCTION: 'bg-amber-50 hover:bg-amber-100',
    DELIVERED: 'bg-blue-50 hover:bg-blue-100',
    CANCEL: 'bg-red-50 hover:bg-red-100',
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('search_string', searchTerm);
      if (statusFilter) params.append('order_status', statusFilter);

      const response = await fetch(`/api/shoporder/list?${params.toString()}`, {
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
        showToast(errorData.error || 'Failed to fetch shop orders', 'error');
      }
    } catch (error) {
      console.error('Error fetching shop orders:', error);
      showToast('Error fetching shop orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const openOrderDetails = (order: ShopOrder) => {
    setSelectedOrder(order);
    setStatusDraft(order.status);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    // Fully unmount the overlay after the slide-out transition finishes,
    // otherwise the fullscreen wrapper stays mounted (invisible) and blocks
    // clicks on the rest of the page until a refresh.
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || statusDraft === selectedOrder.status) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/shoporder/update-status/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: statusDraft }),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedOrder: ShopOrder = {
          ...selectedOrder,
          status: result.status,
          in_production_at: result.in_production_at,
          delivered_at: result.delivered_at,
          cancelled_at: result.cancelled_at,
        };
        setSelectedOrder(updatedOrder);
        showToast('Order status updated successfully', 'success');
        fetchOrders();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating shop order status:', error);
      showToast('Error updating status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Shop Orders" />

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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="regal-input w-32"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="IN_PRODUCTION">IN PRODUCTION</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCEL">CANCEL</option>
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
                  <th className="px-3 py-5 text-left w-32">Barcode</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-center w-24">Current Stock</th>
                  <th className="px-3 py-5 text-left w-20">Qty</th>
                  <th className="px-3 py-5 text-left w-32">Note</th>
                  <th className="px-3 py-5 text-left w-28">Status</th>
                  <th className="px-3 py-5 text-left w-32">Order Placed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrderDetails(order)}
                    className={`text-sm text-gray-900 transition-colors cursor-pointer ${
                      rowColors[order.status] || 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4 font-medium">{order.product_name}</td>
                    <td className="px-3 py-4">{order.barcode || '-'}</td>
                    <td className="px-3 py-4">{order.category || 'N/A'}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={order.current_stock <= 0 ? 'text-red-600 font-semibold' : 'text-yellow-700 font-semibold'}>
                        {order.current_stock}
                      </span>
                    </td>
                    <td className="px-3 py-4">{order.quantity_ordered}</td>
                    <td className="px-3 py-4 truncate" title={order.note || undefined}>{order.note || '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">{formatDateOnly(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <p className="text-center py-12 text-gray-500">No shop orders found</p>
            )}
          </div>

          {totalPagesFromApi > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesFromApi}
                totalItems={totalItems}
                pageSize={pageSize}
                baseUrl="/shop-order"
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Order Placed Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.created_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">In Production Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.in_production_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Delivered Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.delivered_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Cancelled Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.cancelled_at)}</span>
              </div>

              <div className="pt-4">
                <label className="block text-sm text-gray-500 mb-2">Update Status</label>
                <div className="flex gap-2">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    className="regal-input flex-1"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PRODUCTION">IN PRODUCTION</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCEL">CANCEL</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || statusDraft === selectedOrder.status}
                    className={`regal-btn px-4 py-2 ${
                      updatingStatus || statusDraft === selectedOrder.status
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-regal-yellow text-regal-black'
                    }`}
                  >
                    {updatingStatus ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOrderPage;
