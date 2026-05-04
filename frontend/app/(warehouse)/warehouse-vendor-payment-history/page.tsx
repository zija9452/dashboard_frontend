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

const WarehouseVendorPaymentHistoryPage: React.FC = () => {
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

  // Calculate totalPages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch all vendors for dropdown
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/warehouse-vendors/viewvendor?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
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

      let url = `/api/warehouse-vendors/all-payment-history?page=${currentPage}&limit=${pageSize}`;
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
    <div className="p-2 py-5">
      <PageHeader title="Warehouse Vendor Payment History" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Filter by Vendor
          </button>
          <button
            onClick={() => router.push('/warehouse-vendor-payment')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            + Add Payment
          </button>

          <button
            onClick={() => router.push('/warehouse-vendors')}
            className="regal-btn bg-gray-900 text-white whitespace-nowrap"
          >
            ← Back to Vendors
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mb-4">
          <select
            value={selectedVendor}
            onChange={(e) => {
              setSelectedVendor(e.target.value);
              setCurrentPage(1);
            }}
            className="regal-input w-60"
          >
            <option value="">All Warehouse Vendors</option>
            {vendors.map(vendor => (
              <option key={vendor.ven_id} value={vendor.ven_id}>
                {vendor.ven_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No payment history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr className="text-xs text-gray-700 uppercase font-semibold">
                  <th className="px-4 py-4 text-left">Date & Time</th>
                  <th className="px-4 py-4 text-left">Vendor Name</th>
                  <th className="px-4 py-4 text-left">Type</th>
                  <th className="px-4 py-4 text-left">Method</th>
                  <th className="px-4 py-4 text-left">Description</th>
                  <th className="px-4 py-4 text-right">Amount</th>
                  <th className="px-4 py-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment, idx) => (
                  <tr key={idx} className="text-sm hover:bg-gray-50 transition">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">{payment.payment_date}</div>
                      <div className="text-gray-500 text-xs">
                        {payment.datetime ? new Date(payment.datetime).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4">{payment.vendor_name}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        payment.payment_type === 'payment' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.payment_type === 'payment' ? 'Payment' : 'Reverse'}
                      </span>
                    </td>
                    <td className="px-4 py-4">{payment.payment_method}</td>
                    <td className="px-4 py-4">{payment.description}</td>
                    <td className={`px-4 py-4 text-right font-semibold ${
                      payment.payment_type === 'payment' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {payment.payment_type === 'payment' ? '-' : '+'}Rs. {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      Rs. {payment.balance_after.toLocaleString()}
                    </td>
                  </tr>
                ))}
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
            onPageChange={handlePageChange}
            baseUrl=""
          />
        </div>
      )}
    </div>
  );
};

export default WarehouseVendorPaymentHistoryPage;
