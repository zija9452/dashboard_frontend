'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';

interface VendorPayment {
  id: string;
  vendor_name: string;
  vendor_phone: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  remarks: string;
  branch: string;
}

const VendorPaymentPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages - limit to max 5 pages
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Form state
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount: '',
    payment_method: 'Cash',
    remarks: '',
    branch: ''
  });

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Payment method options
  const paymentMethodOptions = [
    'Cash',
    'Bank Transfer',
    'Cheque',
    'Online'
  ];

  // Fetch vendor payments
  const fetchPayments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      // Placeholder - you can create a real API endpoint later
      const response = await fetch(`/api/vendors/payments?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const paymentsList = Array.isArray(data.data) ? data.data : [];
        const total = data.total || paymentsList.length;
        const totalPages = data.totalPages || Math.ceil(total / pageSize);

        setPayments(paymentsList);
        setTotalItems(total);
        setTotalPagesFromApi(totalPages);
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      // For now, just show empty state
      setPayments([]);
      setTotalItems(0);
      setTotalPagesFromApi(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments on page change
  useEffect(() => {
    fetchPayments();
  }, [currentPage, pageSize, searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor_name: '',
      amount: '',
      payment_method: 'Cash',
      remarks: '',
      branch: ''
    });
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    setSubmitting(true);

    try {
      // Placeholder - create actual API endpoint later
      const response = await fetch('/api/vendors/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vendor_name: formData.vendor_name,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          remarks: formData.remarks,
          branch: formData.branch
        }),
      });

      if (response.ok) {
        Swal.fire({
          title: 'Created!',
          text: 'Vendor payment has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        await fetchPayments();
        await resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }
    } catch (error: any) {
      console.error('Error saving payment:', error);
      showToast(error.message || 'Failed to save payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-center mb-6">Vendor Payment</h1>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add New and Back button */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Payment'}
          </button>

          <button
            onClick={() => router.push('/vendors')}
            className="regal-btn bg-gray-300 text-black whitespace-nowrap"
          >
            Back to Vendors
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="paymentSearchInput"
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="regal-input w-full pl-10 pr-4 py-2"
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
          <button
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
            onClick={() => {
              setSearchTerm('');
              document.getElementById('paymentSearchInput')?.focus();
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Add Payment Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">Add New Payment</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                <input
                  type="text"
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter vendor name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter amount"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                >
                  {paymentMethodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter remarks (optional)"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Add Payment'}
              </button>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="regal-btn bg-gray-300 text-black"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Table */}
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
                  <th className="px-4 py-5 text-left w-48">Vendor Name</th>
                  <th className="px-4 py-5 text-left w-32">Phone</th>
                  <th className="px-4 py-5 text-left w-24">Amount</th>
                  <th className="px-4 py-5 text-left w-32">Payment Date</th>
                  <th className="px-4 py-5 text-left w-24">Method</th>
                  <th className="px-4 py-5 text-left w-40">Branch</th>
                  <th className="px-4 py-5 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No vendor payments found. Click "+ Add Payment" to create one.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 text-sm">
                      <td className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{payment.vendor_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{payment.vendor_phone || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap font-semibold text-green-600">
                        Rs. {payment.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{payment.payment_date || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{payment.payment_method}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{payment.branch || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{payment.remarks || '-'}</td>
                    </tr>
                  ))
                )}
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
            baseUrl="/vendor-payment"
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default VendorPaymentPage;
