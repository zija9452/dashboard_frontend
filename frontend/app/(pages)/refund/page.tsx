'use client';

import React, { useState, useEffect } from 'react';

// Define interfaces
interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  created_at: string;
  type: 'customer' | 'walkin';
}

interface Refund {
  id: string;
  invoice_id: string;
  invoice_no: string;
  customer_name: string;
  refund_amount: number;
  refund_items: Array<{
    product_name: string;
    quantity_returned: number;
  }>;
  reason: string;
  created_at: string;
}

const RefundPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [showRefundForm, setShowRefundForm] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Simulated data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockInvoices: Invoice[] = [
          { id: '1', invoice_no: 'CIV-001', customer_name: 'John Doe', total_amount: 125.50, amount_paid: 125.50, balance_due: 0.00, payment_status: 'paid', created_at: '2026-02-01T10:30:00.000Z', type: 'customer' },
          { id: '2', invoice_no: 'WIV-001', customer_name: 'Walk-in Customer', total_amount: 89.99, amount_paid: 89.99, balance_due: 0.00, payment_status: 'paid', created_at: '2026-02-01T11:15:00.000Z', type: 'walkin' },
          { id: '3', invoice_no: 'CIV-002', customer_name: 'Jane Smith', total_amount: 245.75, amount_paid: 100.00, balance_due: 145.75, payment_status: 'partial', created_at: '2026-02-02T09:45:00.000Z', type: 'customer' },
        ];

        const mockRefunds: Refund[] = [
          { id: '1', invoice_id: '1', invoice_no: 'CIV-001', customer_name: 'John Doe', refund_amount: 25.00, refund_items: [{ product_name: 'T-Shirt', quantity_returned: 1 }], reason: 'Defective product', created_at: '2026-02-02T14:30:00.000Z' },
        ];

        setInvoices(mockInvoices);
        setRefunds(mockRefunds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle refund request
  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoice || !refundReason || !refundAmount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // In a real app, this would be an API call
      console.log('Processing refund:', {
        invoiceId: selectedInvoice,
        reason: refundReason,
        amount: parseFloat(refundAmount)
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update UI with new refund
      const invoice = invoices.find(inv => inv.id === selectedInvoice);
      if (invoice) {
        const newRefund: Refund = {
          id: (refunds.length + 1).toString(),
          invoice_id: invoice.id,
          invoice_no: invoice.invoice_no,
          customer_name: invoice.customer_name,
          refund_amount: parseFloat(refundAmount),
          refund_items: [], // Would come from invoice items in real app
          reason: refundReason,
          created_at: new Date().toISOString()
        };

        setRefunds([newRefund, ...refunds]);
        setSelectedInvoice('');
        setRefundReason('');
        setRefundAmount('');
        setShowRefundForm(false);

        alert('Refund processed successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  // Filter invoices for refund (only paid/partial invoices)
  const refundableInvoices = invoices.filter(
    invoice => invoice.payment_status !== 'unpaid' && invoice.balance_due < invoice.total_amount
  );

  // Filter refunds based on search term
  const filteredRefunds = refunds.filter(refund =>
    refund.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    refund.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    refund.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="regal-card m-6">
        <div className="text-red-600 p-4">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="regal-card m-6">
      <h1 className="text-2xl font-bold mb-6">Refund Management</h1>

      {/* Search and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search refunds..."
            className="regal-input w-full md:w-80"
          />
        </div>

        <button
          onClick={() => setShowRefundForm(!showRefundForm)}
          className="regal-btn bg-regal-yellow text-regal-black"
        >
          {showRefundForm ? 'Cancel Refund' : 'Process New Refund'}
        </button>
      </div>

      {/* Refund Form */}
      {showRefundForm && (
        <div className="regal-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Process New Refund</h2>

          <form onSubmit={handleRefund} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice</label>
              <select
                value={selectedInvoice}
                onChange={(e) => setSelectedInvoice(e.target.value)}
                className="regal-input w-full"
                required
              >
                <option value="">Select an invoice</option>
                {refundableInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_no} - {invoice.customer_name} (${invoice.total_amount.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount</label>
              <input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                className="regal-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund"
                className="regal-input w-full"
                rows={3}
                required
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="regal-btn bg-green-600 hover:bg-green-700">
                Process Refund
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRefundForm(false);
                  setSelectedInvoice('');
                  setRefundAmount('');
                  setRefundReason('');
                }}
                className="regal-btn bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Refunds Table */}
      <div className="regal-card">
        <h2 className="text-lg font-semibold mb-4">Refund History</h2>

        <div className="overflow-x-auto">
          <table className="regal-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRefunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{refund.invoice_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${refund.refund_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(refund.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                    <button className="text-red-600 hover:text-red-900">Reversal</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredRefunds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No refunds found.</p>
            {!searchTerm && (
              <button
                onClick={() => setShowRefundForm(true)}
                className="regal-btn mt-4"
              >
                Process New Refund
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RefundPage;