'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';

interface Vendor {
  ven_id: string;
  ven_name: string;
  ven_phone: string;
  vend_balance: number;
}

interface Branch {
  id: string;
  name: string;
}

const VendorPaymentPage: React.FC = () => {
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorBalance, setVendorBalance] = useState<number>(0);

  // Form state
  const [formData, setFormData] = useState({
    payment_type: 'payment',
    branch_id: '',
    vendor_id: '',
    vendor_name: '',
    amount_paid: '',
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Payment type options
  const paymentTypeOptions = [
    { value: 'payment', label: 'Payment' },
    { value: 'reverse_payment', label: 'Reverse Payment' }
  ];

  // Payment method options
  const paymentMethodOptions = [
    'Cash',
    'Easypaisa Zohaib',
    'Easypaisa Yasir',
    'Faysal Bank'
  ];

  // Fetch vendors for dropdown
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors/viewvendor?page=1&limit=10000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const vendorsList = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        setVendors(vendorsList);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches for dropdown
  const fetchBranches = async () => {
    try {
      setBranches([
        { id: '1', name: 'European Sports Light House' },
      ]);
      setFormData(prev => ({
        ...prev,
        branch_id: '1'
      }));
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVendors();
    fetchBranches();
  }, []);

  // Handle vendor selection
  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vendorId = e.target.value;
    const vendor = vendors.find(v => v.ven_id === vendorId);

    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendor_id: vendorId,
        vendor_name: vendor.ven_name
      }));
      setVendorBalance(vendor.vend_balance || 0);
    } else {
      setFormData(prev => ({
        ...prev,
        vendor_id: '',
        vendor_name: ''
      }));
      setVendorBalance(0);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      payment_type: 'payment',
      branch_id: '1',
      vendor_id: '',
      vendor_name: '',
      amount_paid: '',
      payment_method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setVendorBalance(0);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const paymentAmount = formData.amount_paid === '' ? 0 : Number(formData.amount_paid);
    if (paymentAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (!formData.vendor_id) {
      showToast('Please select a vendor', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const endpoint = `/api/vendors/process-payment/${formData.vendor_id}`;

      const payload = {
        amount_paid: paymentAmount,
        payment_method: formData.payment_method.toLowerCase(),
        payment_type: formData.payment_type,
        date: formData.date,
        description: formData.description
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        Swal.fire({
          title: 'Payment Recorded!',
          text: 'Vendor payment has been recorded successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        setVendorBalance(result.new_balance);
        resetForm();
        fetchVendors();
      } else {
        const errorData = await response.json();
        let errorMessage = 'Failed to process payment';
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      showToast('Failed to process payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2 py-5 bg-white min-h-screen">
      <PageHeader title="Vendor Payment" />

      {/* Main Container - 80% width, centered */}
      <div className="md:max-w-[60%] max-w-full mx-auto mt-6 rounded-lg shadow-lg p-2 py-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Payment Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type *</label>
            <select
              name="payment_type"
              value={formData.payment_type}
              onChange={handleInputChange}
              className="regal-input w-full"
            >
              {paymentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select
              name="branch_id"
              value={formData.branch_id}
              onChange={handleInputChange}
              className="regal-input w-full"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
            <select
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleVendorChange}
              className="regal-input w-full"
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.ven_id} value={vendor.ven_id}>
                  {vendor.ven_name}
                </option>
              ))}
            </select>
            {/* Vendor Balance Display */}
            <p className="text-sm text-gray-600 mt-2">
              Balance: <span className="font-semibold text-red-700">Rs. {vendorBalance.toFixed(2)}</span>
            </p>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
            <input
              type="text"
              name="amount_paid"
              value={formData.amount_paid}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                // Allow only digits and decimal point, block minus sign
                if (!/[0-9.]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              className="regal-input w-full"
              placeholder="0.00"
              autoComplete="off"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
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

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="regal-input w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="regal-input w-full"
              placeholder="Payment description"
              rows={3}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={submitting || !formData.vendor_id}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 font-semibold"
            >
              {submitting ? 'Processing...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPaymentPage;
