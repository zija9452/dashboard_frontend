'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Define interfaces
interface InvoiceItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  category: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  items: InvoiceItem[];
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: string;
  created_at: string;
  type: 'customer' | 'walkin';
}

const DuplicateBillPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'all' | 'customer' | 'walkin'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [orderId, setOrderId] = useState<string>('');

  // Simulated data fetch
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockInvoices: Invoice[] = [
          { id: '1', invoice_no: 'CIV-001', customer_name: 'John Doe', items: [{ id: '1', product_name: 'T-Shirt', quantity: 2, unit_price: 25.00, discount: 0, category: 'Clothing' }], total_amount: 50.00, amount_paid: 50.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-01T10:30:00.000Z', type: 'customer' },
          { id: '2', invoice_no: 'WIV-001', customer_name: 'Walk-in Customer', items: [{ id: '1', product_name: 'Jeans', quantity: 1, unit_price: 75.00, discount: 5.00, category: 'Clothing' }], total_amount: 70.00, amount_paid: 70.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-01T11:15:00.000Z', type: 'walkin' },
          { id: '3', invoice_no: 'CIV-002', customer_name: 'Jane Smith', items: [{ id: '1', product_name: 'Sneakers', quantity: 1, unit_price: 120.00, discount: 0, category: 'Footwear' }], total_amount: 120.00, amount_paid: 80.00, balance_due: 40.00, payment_status: 'partial', payment_method: 'cash', created_at: '2026-02-02T09:45:00.000Z', type: 'customer' },
          { id: '4', invoice_no: 'WIV-002', customer_name: 'Walk-in Customer', items: [{ id: '1', product_name: 'Watch', quantity: 1, unit_price: 200.00, discount: 10.00, category: 'Accessories' }], total_amount: 190.00, amount_paid: 190.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-02T14:20:00.000Z', type: 'walkin' },
          { id: '5', invoice_no: 'CIV-003', customer_name: 'Bob Johnson', items: [{ id: '1', product_name: 'Backpack', quantity: 1, unit_price: 60.00, discount: 0, category: 'Accessories' }], total_amount: 60.00, amount_paid: 60.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-03T10:15:00.000Z', type: 'customer' },
          { id: '6', invoice_no: 'WIV-003', customer_name: 'Walk-in Customer', items: [{ id: '1', product_name: 'Sunglasses', quantity: 1, unit_price: 45.00, discount: 0, category: 'Accessories' }], total_amount: 45.00, amount_paid: 45.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-03T13:30:00.000Z', type: 'walkin' },
          { id: '7', invoice_no: 'CIV-004', customer_name: 'Alice Williams', items: [{ id: '1', product_name: 'Hat', quantity: 2, unit_price: 25.00, discount: 2.00, category: 'Clothing' }], total_amount: 48.00, amount_paid: 0.00, balance_due: 48.00, payment_status: 'issued', payment_method: 'cash', created_at: '2026-02-04T09:10:00.000Z', type: 'customer' },
          { id: '8', invoice_no: 'WIV-004', customer_name: 'Walk-in Customer', items: [{ id: '1', product_name: 'Belt', quantity: 1, unit_price: 35.00, discount: 0, category: 'Accessories' }], total_amount: 35.00, amount_paid: 35.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-04T15:45:00.000Z', type: 'walkin' },
        ];

        setInvoices(mockInvoices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Filter invoices based on search term and type
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
                         invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = invoiceType === 'all' || invoice.type === invoiceType;

    return matchesSearch && matchesType;
  });

  // Handle getting invoice by order ID
  const handleGetByOrderId = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderId.trim()) return;

    const invoice = invoices.find(inv => inv.id === orderId || inv.invoice_no.toLowerCase() === orderId.toLowerCase());

    if (invoice) {
      setSelectedInvoice(invoice);
    } else {
      alert('Invoice not found');
    }
  };

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
      <h1 className="text-2xl font-bold mb-6">Duplicate Bill</h1>

      {/* Search by Order ID */}
      <div className="regal-card mb-6">
        <h2 className="text-lg font-semibold mb-4">Search by Order ID</h2>
        <form onSubmit={handleGetByOrderId} className="flex gap-2">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID or Invoice Number"
            className="regal-input flex-grow"
          />
          <button type="submit" className="regal-btn bg-regal-yellow text-regal-black">Search</button>
          <button
            type="button"
            onClick={() => {
              setOrderId('');
              setSelectedInvoice(null);
            }}
            className="regal-btn bg-gray-500 hover:bg-gray-600"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Invoice Details if found by ID */}
      {selectedInvoice && (
        <div className="regal-card mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Invoice Details: {selectedInvoice.invoice_no}</h2>
            <div className="flex gap-2">
              <button className="regal-btn bg-green-600 hover:bg-green-700">Print Bill</button>
              <button className="regal-btn bg-blue-600 hover:bg-blue-700">Download PDF</button>
              <button className="regal-btn bg-gray-500 hover:bg-gray-600">Email</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium mb-2">Customer Information</h3>
              <p><span className="font-medium">Name:</span> {selectedInvoice.customer_name}</p>
              <p><span className="font-medium">Date:</span> {format(new Date(selectedInvoice.created_at), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Payment Information</h3>
              <p><span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  selectedInvoice.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : selectedInvoice.payment_status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {selectedInvoice.payment_status.toUpperCase()}
                </span>
              </p>
              <p><span className="font-medium">Method:</span> {selectedInvoice.payment_method}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium mb-3">Items</h3>
            <table className="regal-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Discount</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item) => {
                  const itemTotal = (item.quantity * item.unit_price) - item.discount;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.product_name}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${item.discount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${itemTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end space-x-8">
              <div className="text-right">
                <p className="mb-1"><span className="font-medium">Subtotal:</span> ${selectedInvoice.total_amount.toFixed(2)}</p>
                <p className="mb-1"><span className="font-medium">Paid:</span> ${selectedInvoice.amount_paid.toFixed(2)}</p>
                <p className="font-bold text-lg"><span className="font-medium">Balance Due:</span> ${selectedInvoice.balance_due.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Invoices Table */}
      <div className="regal-card">
        <h2 className="text-lg font-semibold mb-4">All Invoices</h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoices..."
              className="regal-input w-full"
            />
          </div>

          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as 'all' | 'customer' | 'walkin')}
            className="regal-input"
          >
            <option value="all">All Types</option>
            <option value="customer">Customer Invoice</option>
            <option value="walkin">Walk-in Invoice</option>
          </select>
        </div>

        {/* Invoices Table */}
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
                      {invoice.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{invoice.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      View
                    </button>
                    <button className="text-green-600 hover:text-green-900 mr-3">Print</button>
                    <button className="text-blue-600 hover:text-blue-900">PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredInvoices.length === 0 && !selectedInvoice && (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found matching your criteria.</p>
            {(searchTerm || invoiceType !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setInvoiceType('all');
                }}
                className="regal-btn mt-4"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateBillPage;