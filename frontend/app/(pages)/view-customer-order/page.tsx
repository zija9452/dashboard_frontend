'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface CustomerOrder {
  orderid: string;
  invoice_no?: string;
  status: 'PENDING' | 'DELIVERED' | 'COMPLETED' | 'CANCEL';
  customer: string;
  teamname: string;
  quantity: number;
  total_amount: number;
  date: string;
}

const ViewCustomerOrderPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);
  const pageSize = 8;
  const [showSearch, setShowSearch] = useState(false);

  // Calculate totalPages - limit to max 5 pages (same as products page)
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Status colors mapping
  const statusColors = {
    PENDING: 'bg-lime-200 text-lime-800',
    DELIVERED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCEL: 'bg-red-100 text-red-800',
  };

  // Row background colors based on status
  const rowColors = {
    PENDING: 'bg-lime-100 hover:bg-lime-100',
    DELIVERED: 'bg-blue-50 hover:bg-blue-100',
    COMPLETED: 'bg-green-50 hover:bg-green-100',
    CANCEL: 'bg-red-50 hover:bg-red-100',
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('skip', ((currentPage - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('searchString', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/customerinvoice/viewcustomerorder?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        // Handle paginated response format: { data: [...], page, limit, total, totalPages, has_more }
        const data = result.data || [];
        const total = result.total || 0;
        const totalPagesApi = result.total_pages || Math.ceil(total / pageSize);
        
        console.log('Orders fetched:', data.length);
        console.log('Total items:', total);
        console.log('Total pages:', totalPagesApi);
        console.log('Current page:', currentPage);
        
        setOrders(data);
        setTotalItems(total);
        setTotalPagesFromApi(totalPagesApi);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch orders', 'error');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast('Error fetching orders: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  const handleDelete = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/customerinvoice/${orderId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Order has been deleted successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          fetchOrders();
        } else {
          const errorData = await response.json();
          showToast(errorData.error || 'Failed to delete order', 'error');
        }
      } catch (error) {
        console.error('Error deleting order:', error);
        showToast('Error deleting order', 'error');
      }
    }
  };

  const handleEditStatus = async (orderId: string, currentStatus: string) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Order Status',
      input: 'select',
      inputOptions: {
        PENDING: 'PENDING',
        DELIVERED: 'DELIVERED',
        COMPLETED: 'COMPLETED',
        CANCEL: 'CANCEL',
      },
      inputValue: currentStatus,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
    });

    if (newStatus) {
      try {
        const response = await fetch(`/api/customerinvoice/update-status/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Updated!',
            text: 'Order status has been updated successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          fetchOrders();
        } else {
          const errorData = await response.json();
          showToast(errorData.error || 'Failed to update status', 'error');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4 bg-white">
      <PageHeader title="View Customer Orders" />

      {/* Search Button & Filters - Left Side */}
      <div className="flex items-start gap-4 mb-4">
        <div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
          
          {/* Search Bar & Status Filter - Show on button click */}
          {showSearch && (
            <div className="flex gap-2 mt-2">
              <div className="relative w-72">
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search by invoice, customer or team..."
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
                className="regal-input w-40"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
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
                  <th className="px-3 py-5 text-left w-32">Invoice No</th>
                  <th className="px-3 py-5 text-left w-28">Status</th>
                  <th className="px-3 py-5 text-left w-40">Customer</th>
                  <th className="px-3 py-5 text-left w-32">Team Name</th>
                  <th className="px-3 py-5 text-left w-20">Qty</th>
                  <th className="px-3 py-5 text-left w-28">Total Amount</th>
                  <th className="px-3 py-5 text-left w-28">Date</th>
                  <th className="px-3 py-5 text-left w-32">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <tr
                    key={order.orderid}
                    className={`text-sm text-gray-900 transition-colors ${
                      rowColors[order.status] || 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-4 text-sm">
                      <span className="font-medium text-gray-900">
                        {order.invoice_no || order.orderid.substring(0, 8) + '...'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-4">{order.customer}</td>
                    <td className="px-3 py-4">{order.teamname || '-'}</td>
                    <td className="px-3 py-4">{order.quantity}</td>
                    <td className="px-3 py-4">{order.total_amount.toFixed(0)}</td>
                    <td className="px-3 py-4">
                      {order.date ? new Date(order.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleEditStatus(order.orderid, order.status)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(order.orderid)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No orders found
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
                baseUrl="/view-customer-order"
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewCustomerOrderPage;