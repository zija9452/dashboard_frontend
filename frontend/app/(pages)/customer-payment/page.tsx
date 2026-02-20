'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
  cus_balance: number;
}

interface Order {
  id: string;
  order_id: number;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  created_at: string;
}

const CustomerPaymentPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    branch: '',
    customer_id: '',
    customer_name: '',
    balance: 0,
    amount_paid: 0,
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    order_id: '',
    description: ''
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

  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Fetch all customers from customers API
      const response = await fetch('/api/customers/viewcustomer', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns: { data: [...], page, limit, total, totalPages }
        const customersList = Array.isArray(data.data) ? data.data : [];
        
        // Map to Customer interface
        const uniqueCustomers: Customer[] = customersList.map((c: any) => ({
          cus_id: c.cus_id,
          cus_name: c.cus_name,
          cus_phone: c.cus_phone,
          cus_balance: c.cus_balance || 0
        }));

        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle customer selection
  const handleCustomerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find(c => c.cus_id === customerId);
    
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.cus_name || '',
      balance: customer?.cus_balance || 0,
      order_id: ''
    }));

    // Fetch customer orders if customer selected
    if (customerId) {
      try {
        const response = await fetch(`/api/customerinvoice/customerorders/${customerId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(data || []);
        }
      } catch (error) {
        console.error('Error fetching customer orders:', error);
      }
    } else {
      setOrders([]);
    }
  };

  // Handle order selection
  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = e.target.value;
    setFormData(prev => ({
      ...prev,
      order_id: orderId
    }));
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount_paid' ? Number(value) : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      branch: '',
      customer_id: '',
      customer_name: '',
      balance: 0,
      amount_paid: 0,
      payment_method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      order_id: '',
      description: ''
    });
    setOrders([]);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_id) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (formData.amount_paid <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    // Prevent duplicate submissions
    if (submitting) return;

    setSubmitting(true);

    try {
      // Process payment using customerinvoice API
      const endpoint = formData.order_id 
        ? `/api/customerinvoice/process-payment/${formData.order_id}`
        : `/api/customerinvoice/process-payment/${formData.customer_id}`;

      const payload = {
        amount: formData.amount_paid,
        payment_method: formData.payment_method.toLowerCase(),
        description: formData.description,
        payment_date: formData.date
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Swal.fire({
          title: 'Payment Recorded!',
          text: 'Customer payment has been recorded successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        // Refresh customer data
        await fetchCustomers();
        resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process payment');
      }

      setSubmitting(false);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      showToast(error.message || 'Failed to process payment', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Customer Payment</h1>
        
        <button
          onClick={() => router.push('/customers')}
          className="regal-btn bg-gray-900 text-white whitespace-nowrap"
        >
          ← Back to Customers
        </button>
      </div>

      {/* Payment Form */}
      <div className="border-0 p-0 mb-6">
        <div className="max-w-4xl">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Branch:</label>
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

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-1">Payment *</label>
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

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleCustomerChange}
                  className="regal-input w-full"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.cus_id} value={customer.cus_id}>
                      {customer.cus_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-sm font-medium mb-1">Balance</label>
                <input
                  type="text"
                  value={`₹${formData.balance.toFixed(2)}`}
                  className="regal-input w-full bg-gray-100"
                  readOnly
                />
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium mb-1">Amount Paid *</label>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Amount Paid"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                />
              </div>

              {/* Order Id */}
              <div>
                <label className="block text-sm font-medium mb-1">Order Id</label>
                <select
                  name="order_id"
                  value={formData.order_id}
                  onChange={handleOrderChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Order (Optional)</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Order #{order.order_id} - Balance: ₹{order.balance_due.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Description"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Save Payment'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="regal-btn bg-gray-300 text-black"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerPaymentPage;
