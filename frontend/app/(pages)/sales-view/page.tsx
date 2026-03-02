'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

// Walk-in Invoice interface
interface WalkInInvoice {
  id: string;
  invoice_no: string;
  product_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: string;
  quantity: number;
  discount: number;
  total_discount: number;
  cost: number;
  created_at: string;
}

// Customized Invoice interface
interface CustomizedInvoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: string;
  quantity: number;
  discount: number;
  created_at: string;
  partial_payments: Array<{
    date: string;
    amount: number;
    method: string;
  }>;
}

// Summary interface
interface SalesSummary {
  opening: number;
  totalSale: number;
  grossProfit: number;
  totalExpense: number;
  totalRecovery: number;
  vendorPayments: number;
  netCash: number;
  totalPurchase: number;
  totalRefund: number;
  netProfit: number;
}

const SalesViewPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Filter states
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string>('European Sports Light House');
  const [reportType, setReportType] = useState<string>('daily');

  // Data states
  const [walkInInvoices, setWalkInInvoices] = useState<WalkInInvoice[]>([]);
  const [customizedInvoices, setCustomizedInvoices] = useState<CustomizedInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Summary states
  const [summary, setSummary] = useState<SalesSummary>({
    opening: 0,
    totalSale: 0,
    grossProfit: 0,
    totalExpense: 0,
    totalRecovery: 0,
    vendorPayments: 0,
    netCash: 0,
    totalPurchase: 0,
    totalRefund: 0,
    netProfit: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Branch options
  const branchOptions = [
    'European Sports Light House',
    'Branch 2',
    'Branch 3',
  ];

  // Report type options
  const reportOptions = [
    { value: 'daily', label: 'Daily Report' },
    { value: 'weekly', label: 'Weekly Report' },
    { value: 'monthly', label: 'Monthly Report' },
    { value: 'yearly', label: 'Yearly Report' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      setLoading(true);

      // Fetch walk-in invoices
      const walkinResponse = await fetch(
        `/api/sales-view/walkin-invoices?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
        { credentials: 'include' }
      );

      // Fetch summary
      const summaryResponse = await fetch(
        `/api/sales-view/summary?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
        { credentials: 'include' }
      );

      const walkinData = await walkinResponse.json();
      const summaryData = await summaryResponse.json();

      console.log('Walk-in invoices data:', walkinData);
      setWalkInInvoices(walkinData.invoices || []);
      setSummary(summaryData);

      showToast('Sales data fetched successfully', 'success');
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showToast('Failed to fetch sales data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    // TODO: Implement Excel export
    showToast('Excel export feature coming soon', 'info');
  };

  // View report
  const viewReport = () => {
    // TODO: Implement report view
    showToast(`Viewing ${reportType} report for ${selectedBranch}`, 'info');
  };

  // Initial fetch
  useEffect(() => {
    // Auto-fetch on mount with today's date
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    fetchSalesData();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <PageHeader title="Sales View" />

      <div className="p-4">
        {/* Filters Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            {/* From Date */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="regal-input w-full"
              />
            </div>

            {/* To Date */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="regal-input w-full"
              />
            </div>

            {/* Fetch Button */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={fetchSalesData}
                disabled={loading}
                className="bg-regal-black text-regal-yellow px-6 py-3 rounded-md text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50"
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>

            {/* Branch Selector */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="regal-input w-full"
              >
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Type and Action Buttons */}
          <div className="flex items-end gap-4">
            <div className="w-80">
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="regal-input w-full"
              >
                {reportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={viewReport}
                className="bg-regal-yellow text-regal-black px-3 py-3 rounded-md text-sm font-semibold hover:bg-yellow-400 transition"
              >
                View Report
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-green-700 transition"
              >
                Excel Report
              </button>
            </div>
          </div>
        </div>

          

          
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Side - Walk-in Invoices */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Walk-in Invoices</h2>
            <div className="overflow-x-auto" style={{ minHeight: '280px' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-100">
                  <tr className="text-gray-700 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-3 py-5 text-left w-20">Order ID</th>
                    <th className="px-3 py-5 text-left w-40">Product</th>
                    <th className="px-3 py-5 text-left w-20">Price</th>
                    <th className="px-3 py-5 text-left w-20">Amount Paid</th>
                    <th className="px-3 py-5 text-left w-16">Qty</th>
                    <th className="px-3 py-5 text-left w-20">Discount</th>
                    <th className="px-3 py-5 text-right w-20">Total Discount</th>
                    <th className="px-3 py-5 text-left w-20">Cost</th>
                    <th className="px-3 py-5 text-left w-28">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ) : walkInInvoices.length === 0 ? (
                    <>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                          No walk-in invoices found
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {walkInInvoices.map((invoice, idx) => (
                        <tr key={`${invoice.id}-${idx}`} className="text-sm text-gray-900 border-b border-gray-200" style={{ height: '70px' }}>
                          <td className="px-3 py-4 font-mono text-xs truncate">{invoice.invoice_no}</td>
                          <td className="px-3 py-4">{invoice.product_name}</td>
                          <td className="px-2 py-4 text-left">{invoice.total_amount}</td>
                          <td className="px-2 py-4 text-left">{invoice.amount_paid}</td>
                          <td className="px-3 py-4 text-left">{invoice.quantity}</td>
                          <td className="px-2 py-4 text-center">{invoice.discount}</td>
                          <td className="px-2 py-4 text-center">{invoice.total_discount}</td>
                          <td className="px-2 py-4 text-left">{invoice.cost}</td>
                          <td className="px-3 py-4">
                            {new Date(invoice.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {/* Add empty rows if less than 4 invoices */}
                      {walkInInvoices.length < 4 && Array.from({ length: 4 - walkInInvoices.length }).map((_, idx) => (
                        <tr key={`empty-${idx}`} style={{ height: '70px' }}>
                          <td className="px-3 py-4"></td>
                          <td className="px-3 py-4"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-3 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-3 py-4"></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side - Customized Invoices */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Customized Invoices</h2>
            <div className="overflow-x-auto" style={{ minHeight: '280px' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-100">
                  <tr className="text-gray-700 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-3 py-5 text-left w-20">Order ID</th>
                    <th className="px-3 py-5 text-left w-[154px]">Customer</th>
                    <th className="px-3 py-5 text-left w-20">Total</th>
                    <th className="px-3 py-5 text-right w-20">Paid</th>
                    <th className="px-3 py-5 text-right w-20">Balance</th>
                    <th className="px-3 py-5 text-left w-20">Status</th>
                    <th className="px-3 py-5 text-left w-20">Payment</th>
                    <th className="px-3 py-5 w-20">Qty</th>
                    <th className="px-3 py-5 text-left w-28">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ) : customizedInvoices.length === 0 ? (
                    <>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr style={{ height: '70px' }}>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-2 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4"></td>
                        <td className="px-3 py-4 text-right"></td>
                        <td className="px-3 py-4"></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                          No customized invoices found
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {customizedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="text-sm text-gray-900 border-b border-gray-200" style={{ height: '70px' }}>
                          <td className="px-3 py-4 font-mono text-xs truncate">{invoice.invoice_no}</td>
                          <td className="px-3 py-4 font-medium">{invoice.product_name}</td>
                          <td className="px-2 py-4 text-left">{invoice.total_amount}</td>
                          <td className="px-2 py-4 text-right">{invoice.amount_paid}</td>
                          <td className="px-2 py-4 text-right">{invoice.balance_due}</td>
                          <td className="px-3 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.payment_status}
                            </span>
                          </td>
                          <td className="px-3 py-4 capitalize">{invoice.payment_method}</td>
                          <td className="px-3 py-4 text-center">{invoice.quantity}</td>
                          <td className="px-3 py-4">
                            {new Date(invoice.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {/* Add empty rows if less than 4 invoices */}
                      {customizedInvoices.length < 4 && Array.from({ length: 4 - customizedInvoices.length }).map((_, idx) => (
                        <tr key={`empty-${idx}`} style={{ height: '70px' }}>
                          <td className="px-3 py-4"></td>
                          <td className="px-3 py-4"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-2 py-4 text-right"></td>
                          <td className="px-3 py-4"></td>
                          <td className="px-3 py-4"></td>
                          <td className="px-3 py-4 text-right"></td>
                          <td className="px-3 py-4"></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-600 font-bold text-xl">
            <div className="flex items-center gap-1">
              <p>Opening:</p>
              <p>{summary.opening}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Sale:</p>
              <p>{summary.totalSale}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Gross Profit:</p>
              <p>{summary.grossProfit}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Expense:</p>
              <p>{summary.totalExpense}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Recovery:</p>
              <p>{summary.totalRecovery}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Vendor Payments:</p>
              <p>{summary.vendorPayments}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Net Cash:</p>
              <p>{summary.netCash}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Purchase:</p>
              <p>{summary.totalPurchase}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Refund:</p>
              <p>{summary.totalRefund}</p>
            </div>
            <div className="flex items-center gap-1 col-span-2 md:col-span-2">
              <p>Net Profit:</p>
              <p>{summary.netProfit}</p>
            </div>
          </div>
        </div>
        

    </div>
  );
};

export default SalesViewPage;
