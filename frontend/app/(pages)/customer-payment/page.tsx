'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';

// Print styles - only print modal content
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .payment-history-report-modal,
    .payment-history-report-modal * {
      visibility: visible;
    }
    .payment-history-report-modal {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: auto;
      background: white;
      overflow: visible;
    }
    .no-print {
      display: none !important;
    }
    @page {
      margin: 1cm;
      size: A4;
    }
  }
`;

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
  cus_balance: number;
}

interface Branch {
  id: string;
  name: string;
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
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentHistoryPDF, setShowPaymentHistoryPDF] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Form state
  const [formData, setFormData] = useState({
    payment_type: 'payment',
    branch_id: '',
    customer_id: '',
    customer_name: '',
    amount_paid: '',
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    order_id: '', // This stores the UUID for API calls
    invoice_no: '', // This stores the display invoice number
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

  // Fetch branches for dropdown (placeholder - API to be added later)
  const fetchBranches = async () => {
    try {
      // TODO: Add branch API endpoint later
      // const response = await fetch('/api/branches', { method: 'GET', credentials: 'include' });
      // For now, using placeholder data
      setBranches([
        { id: '1', name: 'European Sports Light House' },
      ]);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
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

    setSelectedInvoice(null);

    // Fetch customer invoices if customer selected
    if (customerId) {
      await fetchCustomerInvoices(customerId);
    } else {
      setInvoices([]);
      setTotalBalance(0);
    }
  };

  // Fetch customer invoices (all invoices without pagination)
  const fetchCustomerInvoices = async (customerId: string) => {
    try {
      setLoading(true);
      // Fetch all invoices - no pagination
      const response = await fetch(`/api/customerinvoice/customerorders/${customerId}?skip=0&limit=10000`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result || [];
        
        setInvoices(data);
        
        // Calculate total balance
        const total = data.reduce((sum: number, invoice: Invoice) => sum + (invoice.balance_due || 0), 0);
        setTotalBalance(total);
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
      order_id: invoice.orderid, // UUID for API
      invoice_no: invoice.invoice_no, // Display invoice number
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
      setLoading(true);
      setLoadingInvoiceId(invoiceId);
      
      // Get invoice details with payment history
      const response = await fetch(`/api/customerinvoice/payment-history/${invoiceId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Parse payment history (it might be a JSON string or array)
        let history = [];
        if (typeof data.payments_history === 'string') {
          try {
            history = JSON.parse(data.payments_history);
          } catch {
            history = data.payments_history || [];
          }
        } else {
          history = data.payments_history || [];
        }

        setPaymentHistory(history);

        // Set selected invoice with the data from API
        setSelectedInvoice({
          invoice_no: data.invoice_no,
          total_amount: data.total_amount,
          amount_paid: data.amount_paid,
          balance_due: data.balance_due,
          payment_status: data.payment_status,
          orderid: data.invoice_id,
          status: 'pending',
          customer: '',
          teamname: '',
          quantity: 0,
          date: '',
          created_at: ''
        });

        setShowPaymentHistoryPDF(true);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch payment history', 'error');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      showToast('Failed to fetch payment history', 'error');
    } finally {
      setLoading(false);
      setLoadingInvoiceId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      payment_type: 'payment',
      branch_id: '',
      customer_id: '',
      customer_name: '',
      amount_paid: '',
      payment_method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      order_id: '',
      invoice_no: '',
      description: ''
    });
    setInvoices([]);
    setSelectedInvoice(null);
    setTotalBalance(0);
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
          await fetchCustomerInvoices(formData.customer_id);
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
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <PageHeader title="Customer Payment" />

      {/* Main Container - 80% width, light yellow background */}
      <div className="max-w-[80%] mx-auto mt-6 rounded-lg shadow-lg p-6">
          
          {/* Two Column Layout */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Side - Payment Form (6 columns) */}
            <div className="col-span-12 lg:col-span-6">
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

              {/* Customer Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleCustomerChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.cus_id} value={customer.cus_id}>
                      {customer.cus_name}
                    </option>
                  ))}
                </select>
                {/* Customer Balance Display */}
                <p className="text-sm text-gray-600 mt-2">
                  Balance: <span className="font-semibold text-red-700">Rs. {totalBalance.toFixed(2)}</span>
                </p>
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
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

              {/* Order ID (Invoice No) - Auto-filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order ID (Invoice No)</label>
                <input
                  type="text"
                  name="invoice_no"
                  value={formData.invoice_no}
                  onChange={handleInputChange}
                  className="regal-input w-full bg-gray-50"
                  placeholder="Select invoice from right"
                  readOnly
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
                  disabled={submitting || !formData.order_id || !formData.customer_id}
                  className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 font-semibold"
                >
                  {submitting ? 'Processing...' : 'Save Payment'}
                </button>
              </div>
              </form>
            </div>

            {/* Right Side - Invoices List (6 columns) */}
            <div className="col-span-12 lg:col-span-6">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                      <th className="px-3 py-3 text-left w-24">Invoice No</th>
                      <th className="px-3 py-3 text-left w-24">Order Status</th>
                      <th className="px-3 py-3 text-left w-20">Payment</th>
                      <th className="px-3 py-3 text-left w-24">Total</th>
                      <th className="px-3 py-3 text-left w-24">Paid</th>
                      <th className="px-3 py-3 text-left w-24">Balance</th>
                      <th className="px-3 py-3 text-left w-28">Date</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && invoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12">
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-500">
                          {formData.customer_id 
                            ? 'No invoices found for this customer.' 
                            : 'No customer selected. Please select a customer to view invoices.'}
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr
                          key={invoice.orderid}
                          className={`text-sm text-gray-900 cursor-pointer transition-colors ${getRowBackgroundColor(invoice.status)} ${
                            selectedInvoice?.orderid === invoice.orderid ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleInvoiceSelect(invoice)}
                        >
                          <td className="px-3 py-3">
                            <span className="font-medium text-gray-900">{invoice.invoice_no}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.payment_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">{invoice.total_amount.toFixed(0)}</td>
                          <td className="px-3 py-3 text-green-700 font-medium">{invoice.amount_paid.toFixed(0)}</td>
                          <td className="px-3 py-3 text-red-700 font-medium text-center">{invoice.balance_due.toFixed(0)}</td>
                          <td className="px-3 py-3">{invoice.date}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchPaymentHistory(invoice.orderid);
                                }}
                                disabled={loadingInvoiceId === invoice.orderid}
                                className={`text-xs font-medium px-3 py-1 rounded border ${
                                  loadingInvoiceId === invoice.orderid
                                    ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                    : 'bg-regal-yellow text-regal-black border-regal-yellow hover:bg-yellow-600'
                                }`}
                              >
                                {loadingInvoiceId === invoice.orderid ? 'Loading...' : 'History'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        
      </div>

      {/* Payment History Report Modal - PDF Style Layout */}
      {showPaymentHistoryPDF && selectedInvoice && (
        <div className="payment-history-report-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static print:block print:inset-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:w-full print:m-0">
            <div className="p-6 print:p-4">
              <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-xl font-bold">Payment History Report</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="regal-btn bg-regal-yellow text-regal-black px-4 py-2 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                  <button
                    onClick={() => setShowPaymentHistoryPDF(false)}
                    className="regal-btn bg-gray-300 text-black px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Invoice Details - PDF Style */}
              <div className="mb-6 p-4 border-2 border-gray-300 rounded bg-gray-50">
                <div className="text-center mb-4 border-b-2 border-gray-800 pb-2">
                  <h1 className="text-2xl font-bold">PAYMENT HISTORY REPORT</h1>
                  <p className="text-sm text-gray-600">Customer Invoice Payment Details</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Invoice No:</p>
                    <p className="font-bold text-lg">{selectedInvoice.invoice_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status:</p>
                    <p className="font-bold capitalize">{selectedInvoice.payment_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount:</p>
                    <p className="font-bold text-lg">Rs. {selectedInvoice.total_amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Paid:</p>
                    <p className="font-bold text-lg text-green-700">Rs. {selectedInvoice.amount_paid?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Balance Due:</p>
                    <p className="text-xl font-bold text-red-700">Rs. {selectedInvoice.balance_due?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Payment History Table */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Payment Records</h3>
                  {paymentHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No payment history available</p>
                  ) : (
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Method</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2">{new Date(payment.date).toLocaleDateString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-green-700 font-medium">
                              Rs. {payment.amount.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 capitalize">{payment.payment_method}</td>
                            <td className="border border-gray-300 px-4 py-2">{payment.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
                  <p>This is a computer-generated report. No signature required.</p>
                  <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPaymentPage;
