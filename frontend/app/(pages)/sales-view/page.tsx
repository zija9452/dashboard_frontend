'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Define interfaces
interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: string;
  created_at: string;
  type: 'customer' | 'walkin';
}

const SalesViewPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'walkin'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Function to fetch sales data
  const fetchSales = async () => {
    try {
      setLoading(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockInvoices: Invoice[] = [
        { id: '1', invoice_no: 'CIV-001', customer_name: 'John Doe', total_amount: 125.50, amount_paid: 125.50, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-01T10:30:00.000Z', type: 'customer' },
        { id: '2', invoice_no: 'WIV-001', customer_name: 'Walk-in Customer', total_amount: 89.99, amount_paid: 89.99, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-01T11:15:00.000Z', type: 'walkin' },
        { id: '3', invoice_no: 'CIV-002', customer_name: 'Jane Smith', total_amount: 245.75, amount_paid: 100.00, balance_due: 145.75, payment_status: 'partial', payment_method: 'cash', created_at: '2026-02-02T09:45:00.000Z', type: 'customer' },
        { id: '4', invoice_no: 'WIV-002', customer_name: 'Walk-in Customer', total_amount: 56.25, amount_paid: 56.25, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-02T14:20:00.000Z', type: 'walkin' },
        { id: '5', invoice_no: 'CIV-003', customer_name: 'Bob Johnson', total_amount: 320.00, amount_paid: 320.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-03T16:30:00.000Z', type: 'customer' },
        { id: '6', invoice_no: 'WIV-003', customer_name: 'Walk-in Customer', total_amount: 187.50, amount_paid: 150.00, balance_due: 37.50, payment_status: 'partial', payment_method: 'card', created_at: '2026-02-03T17:45:00.000Z', type: 'walkin' },
        { id: '7', invoice_no: 'CIV-004', customer_name: 'Alice Williams', total_amount: 98.25, amount_paid: 98.25, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-04T10:15:00.000Z', type: 'customer' },
        { id: '8', invoice_no: 'WIV-004', customer_name: 'Walk-in Customer', total_amount: 210.75, amount_paid: 210.75, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-04T13:30:00.000Z', type: 'walkin' },
      ];

      setInvoices(mockInvoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSales();
  }, []);

  // Filter invoices based on criteria
  const filteredInvoices = invoices.filter(invoice => {
    const matchesDate = (!startDate || new Date(invoice.created_at) >= new Date(startDate)) &&
                        (!endDate || new Date(invoice.created_at) <= new Date(endDate));
    const matchesType = filterType === 'all' || invoice.type === filterType;
    const matchesSearch = !searchTerm ||
                         invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && matchesType && matchesSearch;
  });

  // Calculate totals
  const totalSales = filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const totalReceived = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0);
  const totalOutstanding = filteredInvoices.reduce((sum, invoice) => sum + invoice.balance_due, 0);

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
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
      <h1 className="text-2xl font-bold mb-6">Sales View</h1>

      {/* Filters */}
      <div className="regal-card mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="regal-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="regal-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'customer' | 'walkin')}
              className="regal-select w-full"
            >
              <option value="all">All Types</option>
              <option value="customer">Customer Invoice</option>
              <option value="walkin">Walk-in Invoice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice or customer..."
              className="regal-input w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button 
            onClick={fetchSales}
            disabled={loading}
            className="regal-btn-primary flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching...
              </>
            ) : 'Fetch Data'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="regal-card">
          <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
          <p className="text-2xl font-semibold">${totalSales.toFixed(2)}</p>
        </div>

        <div className="regal-card">
          <h3 className="text-sm font-medium text-gray-500">Total Received</h3>
          <p className="text-2xl font-semibold">${totalReceived.toFixed(2)}</p>
        </div>

        <div className="regal-card">
          <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
          <p className="text-2xl font-semibold">${totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="regal-card">
        <div className="overflow-x-auto">
          <table className="regal-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.amount_paid.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.balance_due.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(invoice.created_at), 'yyyy-MM-dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.type === 'customer' ? 'Customer' : 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                    <button className="text-green-600 hover:text-green-900 mr-3">Print</button>
                    <button className="text-gray-600 hover:text-gray-900">Receipt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesViewPage;