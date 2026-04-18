'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';

interface VendorPayment {
  vendor_id: string;
  vendor_name: string;
  payment_date: string;
  datetime: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  description: string;
  balance_after: number;
}

interface Vendor {
  ven_id: string;
  ven_name: string;
  ven_phone: string;
  vend_balance?: number;
}

const VendorPaymentHistoryPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate totalPages - limit to max 5 pages
  const totalPagesFromApi = Math.ceil(totalItems / pageSize);
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Fetch all vendors for dropdown
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors/viewvendor?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns: { data: [{ven_id, ven_name, ...}], page, limit, total, totalPages }
        setVendors(data.data || []);
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = async (vendorId?: string) => {
    try {
      setLoading(true);

      // Build URL with proper query parameters
      let url = `/api/vendors/all-payment-history?page=${currentPage}&limit=${pageSize}`;
      if (vendorId) {
        url += `&vendor_id=${vendorId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setTotalItems(data.total || 0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch payment history', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVendors();
  }, []);

  // Fetch payment history when page or selected vendor changes
  useEffect(() => {
    fetchPaymentHistory(selectedVendor || undefined);
  }, [currentPage, selectedVendor]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5 pt-14 sm-0">
      <PageHeader title="Vendor Payment History" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add Payment and Back button */}
        <div className="flex flex-wrap gap-2">
          {/* Search Button */}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setTimeout(() => document.getElementById('vendorFilter')?.focus(), 100);
              }
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
          <button
            onClick={() => router.push('/vendor-payment')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            + Add Payment
          </button>

          <button
            onClick={() => router.push('/vendors')}
            className="regal-btn bg-gray-900 text-white whitespace-nowrap"
          >
            ← Back to Vendors
          </button>
        </div>

        {/* Right side - Placeholder for alignment */}
        <div className="w-full sm:w-auto"></div>
      </div>

      {/* Vendor Filter Dropdown - Show on button click */}
      {showSearch && (
        <div className="mb-4">
          <select
            id="vendorFilter"
            value={selectedVendor}
            onChange={(e) => {
              const vendorId = e.target.value;
              setSelectedVendor(vendorId);
              setCurrentPage(1);
              fetchPaymentHistory(vendorId || undefined);
            }}
            className="regal-input w-60"
            autoFocus
          >
            <option value="">All Vendors</option>
            {vendors.map(vendor => (
              <option key={vendor.ven_id} value={vendor.ven_id}>
                {vendor.ven_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payment History Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No payment history found</p>
            {selectedVendor && (
              <button
                onClick={() => {
                  setSelectedVendor('');
                  router.push('/vendor-payment-history');
                  fetchPaymentHistory();
                }}
                className="text-regal-yellow hover:underline font-medium mt-2"
              >
                Show all vendors
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr className="text-xs text-gray-700 uppercase font-semibold">
                  <th className="px-4 py-4 text-left">Date & Time</th>
                  <th className="px-4 py-4 text-left">Vendor Name</th>
                  <th className="px-4 py-4 text-left">Payment Type</th>
                  <th className="px-4 py-4 text-left">Payment Method</th>
                  <th className="px-4 py-4 text-left">Description</th>
                  <th className="px-4 py-4 text-right">Amount</th>
                  <th className="px-4 py-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment, idx) => (
                  <tr key={idx} className="text-sm hover:bg-gray-50 transition">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">
                        {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(payment.datetime || payment.payment_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">{payment.vendor_name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        payment.payment_type === 'payment' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.payment_type === 'payment' ? 'Payment' : 'Reverse'}
                      </span>
                    </td>
                    <td className="px-4 py-4 capitalize text-gray-700">
                      {payment.payment_method}
                    </td>
                    <td className="px-4 py-4 text-gray-600 max-w-xs truncate">
                      {payment.description || '-'}
                    </td>
                    <td className={`px-4 py-4 text-right font-semibold ${
                      payment.payment_type === 'payment' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {payment.payment_type === 'payment' ? '-' : '+'}Rs. {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-800">
                      Rs. {payment.balance_after.toLocaleString()}
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
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/vendor-payment-history"
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default VendorPaymentHistoryPage;
