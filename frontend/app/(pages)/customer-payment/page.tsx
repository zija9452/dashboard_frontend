'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
  cus_balance: number;
}

interface Invoice {
  orderid: string;
  invoice_no: string;
  status: 'pending' | 'delivered' | 'completed' | 'cancel';
  customer: string;
  teamname: string;
  quantity: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  date: string;
  created_at: string;
}

interface PaymentHistory {
  amount: number;
  payment_method: string;
  date: string;
  description: string;
}

const CustomerPaymentPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);
  const pageSize = 8;
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    amount_paid: '',
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    order_id: '',
    description: ''
  });

  // Payment method options
  const paymentMethodOptions = [
    'Cash',
    'Easypaisa Zohaib',
    'Easypaisa Yasir',
    'Faysal Bank'
  ];

  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const customersList = Array.isArray(data.data) ? data.data : [];
        setCustomers(customersList);
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
      order_id: ''
    }));

    // Fetch customer invoices if customer selected
    if (customerId) {
      await fetchCustomerInvoices(customerId, 1);
    } else {
      setInvoices([]);
    }
  };

  // Fetch customer invoices
  const fetchCustomerInvoices = async (customerId: string, page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('skip', ((page - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('searchString', searchTerm);

      const response = await fetch(`/api/customerinvoice/customerorders/${customerId}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result || [];
        const total = result.total || data.length;
        const totalPagesApi = result.total_pages || Math.ceil(total / pageSize);
        
        setInvoices(data);
        setTotalPagesFromApi(totalPagesApi);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      showToast('Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle invoice selection
  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData(prev => ({
      ...prev,
      order_id: invoice.orderid,
      amount_paid: ''
    }));
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch payment history
  const fetchPaymentHistory = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/customerinvoice/${invoiceId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const history = data.fields?.payments_history || data.payments_history || [];
        setPaymentHistory(history);
        setShowPaymentHistory(true);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      showToast('Failed to fetch payment history', 'error');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      amount_paid: '',
      payment_method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      order_id: '',
      description: ''
    });
    setInvoices([]);
    setSelectedInvoice(null);
    setSearchTerm('');
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_id) {
      showToast('Please select a customer', 'error');
      return;
    }

    const paymentAmount = formData.amount_paid === '' ? 0 : Number(formData.amount_paid);
    if (paymentAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (!formData.order_id) {
      showToast('Please select an invoice', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const endpoint = `/api/customerinvoice/process-payment/${formData.order_id}`;

      const payload = {
        amount: paymentAmount,
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

        // Refresh invoices
        if (formData.customer_id) {
          await fetchCustomerInvoices(formData.customer_id, currentPage);
        }
        resetForm();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to process payment', 'error');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      showToast(error.message || 'Failed to process payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (formData.customer_id) {
      fetchCustomerInvoices(formData.customer_id, page);
    }
  };

  // Handle edit order status
  const handleEditStatus = async (invoice: Invoice) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Order Status',
      input: 'select',
      inputOptions: {
        'pending': 'Pending',
        'delivered': 'Delivered',
        'completed': 'Completed',
        'cancel': 'Cancel'
      },
      inputValue: invoice.status,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (['pending', 'delivered', 'completed', 'cancel'].includes(value)) {
            resolve('')
          } else {
            resolve('Please select a valid status')
          }
        })
      }
    });

    if (newStatus) {
      try {
        const response = await fetch(`/api/customerinvoice/update-status/${invoice.orderid}`, {
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
          
          // Refresh invoices
          if (formData.customer_id) {
            await fetchCustomerInvoices(formData.customer_id, currentPage);
          }
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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-lime-100 text-lime-800';
      case 'cancel':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get row background color based on status
  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 hover:bg-green-100';
      case 'delivered':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'pending':
        return 'bg-lime-50 hover:bg-lime-100';
      case 'cancel':
        return 'bg-red-50 hover:bg-red-100';
      default:
        return 'hover:bg-gray-50';
    }
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <PageHeader title="Customer Payment" />

      {/* Search & Customer Selection - Centered */}
      <div className="flex justify-center items-start gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => document.getElementById('customerSelect')?.focus()}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Select Customer
          </button>
          
          {/* Customer Dropdown */}
          <div className="relative w-80">
            <select
              id="customerSelect"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleCustomerChange}
              className="regal-input w-full pl-10 pr-4 py-2"
              autoFocus
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.cus_id} value={customer.cus_id}>
                  {customer.cus_name}
                </option>
              ))}
            </select>
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Payment Form */}
        <div className="lg:col-span-1">
          <div className="regal-card sticky top-16">
            <h2 className="text-xl font-semibold mb-4">Make Payment</h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Payment Method */}
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

                {/* Amount Paid */}
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid *</label>
                  <input
                    type="number"
                    name="amount_paid"
                    value={formData.amount_paid}
                    onChange={handleInputChange}
                    className="regal-input w-full"
                    placeholder="Enter amount (0 for credit)"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Date *</label>
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
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="regal-input w-full"
                    placeholder="Payment description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={submitting || !formData.order_id}
                  className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {submitting ? 'Processing...' : 'Save Payment'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="regal-btn bg-gray-300 text-black w-full"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Invoices List */}
        <div className="lg:col-span-2">
          <div className="border-0 p-0">
            {loading && invoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {formData.customer_id ? 'No invoices found for this customer' : 'Select a customer to view invoices'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-100">
                    <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                      <th className="px-3 py-5 text-left w-28">Invoice No</th>
                      <th className="px-3 py-5 text-left w-28">Order Status</th>
                      <th className="px-3 py-5 text-left w-24">Payment</th>
                      <th className="px-3 py-5 text-left w-28">Total</th>
                      <th className="px-3 py-5 text-left w-28">Paid</th>
                      <th className="px-3 py-5 text-left w-28">Balance</th>
                      <th className="px-3 py-5 text-left w-28">Date</th>
                      <th className="px-3 py-5 text-left w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.orderid}
                        className={`text-sm text-gray-900 cursor-pointer transition-colors ${getRowBackgroundColor(invoice.status)} ${
                          selectedInvoice?.orderid === invoice.orderid ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleInvoiceSelect(invoice)}
                      >
                        <td className="px-3 py-4 text-sm">
                          <span className="font-medium text-gray-900">{invoice.invoice_no}</span>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.payment_status)}`}>
                            {invoice.payment_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4">Rs. {invoice.total_amount.toFixed(0)}</td>
                        <td className="px-3 py-4 text-green-700 font-medium">Rs. {invoice.amount_paid.toFixed(0)}</td>
                        <td className="px-3 py-4 text-red-700 font-medium">Rs. {invoice.balance_due.toFixed(0)}</td>
                        <td className="px-3 py-4">{invoice.date}</td>
                        <td className="px-3 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStatus(invoice);
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Edit Status
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPaymentHistory(invoice.orderid);
                              }}
                              className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                            >
                              History
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvoiceSelect(invoice);
                              }}
                              className={`text-sm font-medium ${
                                selectedInvoice?.orderid === invoice.orderid
                                  ? 'text-green-600'
                                  : 'text-regal-yellow hover:text-regal-yellow-dark'
                              }`}
                            >
                              {selectedInvoice?.orderid === invoice.orderid ? 'Selected' : 'Pay'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={invoices.length}
                      pageSize={pageSize}
                      baseUrl="/customer-payment"
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History Modal */}
      {showPaymentHistory && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Payment History</h2>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Invoice: <span className="font-semibold">{selectedInvoice.invoice_no}</span></p>
                <p className="text-sm text-gray-600">Total Amount: <span className="font-semibold">Rs. {selectedInvoice.total_amount.toFixed(0)}</span></p>
                <p className="text-sm text-gray-600">Total Paid: <span className="font-semibold text-green-700">Rs. {selectedInvoice.amount_paid.toFixed(0)}</span></p>
                <p className="text-sm text-gray-600">Balance Due: <span className="font-semibold text-red-700">Rs. {selectedInvoice.balance_due.toFixed(0)}</span></p>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history available
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="text-xs text-gray-900 uppercase font-semibold">
                      <th className="px-3 py-3 text-left">Date</th>
                      <th className="px-3 py-3 text-left">Amount</th>
                      <th className="px-3 py-3 text-left">Method</th>
                      <th className="px-3 py-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentHistory.map((payment, index) => (
                      <tr key={index} className="text-sm">
                        <td className="px-3 py-3">{new Date(payment.date).toLocaleDateString()}</td>
                        <td className="px-3 py-3 font-medium text-green-700">Rs. {payment.amount.toFixed(0)}</td>
                        <td className="px-3 py-3 capitalize">{payment.payment_method}</td>
                        <td className="px-3 py-3 text-gray-600">{payment.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="regal-btn bg-gray-300 text-black px-6 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPaymentPage;
