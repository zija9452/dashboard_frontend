'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

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
  // Refund tracking fields
  is_refunded?: boolean;
  refund_records?: Array<{
    refund_date: string;
    refund_amount: number;
    refund_reason?: string;
    refund_items: Array<{
      product_name: string;
      product_id?: string;
      quantity_returned: number;
      unit_price: number;
      total_amount: number;
    }>;
  }>;
}

// Customized Invoice interface (Cash Basis - Payment-wise)
interface CustomizedInvoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  team_name: string;
  total_amount: number;
  payment_in_selected_range: number;  // Jo payment selected date(s) mein hui
  total_paid: number;                  // Cumulative total paid till now
  pending: number;                     // Remaining balance
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_methods_used: string[];      // Methods used in selected date(s)
  quantity: number;
  created_at: string;
  payment_time: string;                // Time of payment on selected date (backend formatted)
  payment_at: string;                  // ISO timestamp of payment
  payments_in_range: Array<{
    date: string;
    amount: number;
    method: string;
    description: string;
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
  walkin_sales?: number;
  customer_payments?: number;
}

// Customized Summary interface
interface CustomizedSummary {
  total_collection: number;
  cash: number;
  easypaisa_zohaib: number;
  easypaisa_yasir: number;
  bank: number;
  invoices_count: number;
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
  
  // Refund tooltip state - track which invoice row is being hovered
  const [hoveredInvoiceId, setHoveredInvoiceId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{top: number, left: number} | null>(null);
  const [activeTooltipInvoice, setActiveTooltipInvoice] = useState<WalkInInvoice | null>(null);
  const tooltipTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
    walkin_sales: 0,
    customer_payments: 0,
  });

  const [customizedSummary, setCustomizedSummary] = useState<CustomizedSummary>({
    total_collection: 0,
    cash: 0,
    easypaisa_zohaib: 0,
    easypaisa_yasir: 0,
    bank: 0,
    invoices_count: 0,
  });

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportPdfData, setReportPdfData] = useState<string>('');

  // Branch options
  const branchOptions = [
    "Select Branch",
    'European Sports Light House',
  ];

  // Report type options
  const reportOptions = [
    { value: 'select-report', label: 'Select Report' },
    { value: 'walkin-invoice', label: 'Walk-In Invoice' },
    { value: 'customer-invoice', label: 'Customer Invoice' },
    { value: 'expense', label: 'Expense' },
    { value: 'refund', label: 'Refund' },
    { value: 'stockadjustment', label: 'Stock Adjustment' },
  ];

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      setLoading(true);

      // Fetch all APIs in parallel for better performance
      const [walkinResponse, customizedResponse, summaryResponse, customizedSummaryResponse] = await Promise.all([
        fetch(
          `/api/salesview/walkin-invoices?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
          { credentials: 'include' }
        ),
        fetch(
          `/api/salesview/customized-invoices?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
          { credentials: 'include' }
        ),
        fetch(
          `/api/salesview/summary?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
          { credentials: 'include' }
        ),
        fetch(
          `/api/salesview/customized-summary?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`,
          { credentials: 'include' }
        )
      ]);

      const walkinData = await walkinResponse.json();
      const customizedData = await customizedResponse.json();
      const summaryData = await summaryResponse.json();
      const customizedSummaryData = await customizedSummaryResponse.json();

      setWalkInInvoices(walkinData.invoices || []);
      setCustomizedInvoices(customizedData.invoices || []);
      setSummary(summaryData);
      setCustomizedSummary(customizedSummaryData);

      showToast('Sales data fetched successfully', 'success');
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showToast('Failed to fetch sales data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Report generation loading states (separate for each button)
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setGeneratingExcel(true);

      let apiUrl = '';
      let reportName = '';

      // Determine which report to generate based on reportType
      if (reportType === 'walkin-invoice') {
        apiUrl = `/api/salesview/walkin-invoices/excel?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportName = 'Walk-in Invoices';
      } else if (reportType === 'customer-invoice') {
        apiUrl = `/api/salesview/customized-invoices/excel?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportName = 'Customer Invoices';
      } else if (reportType === 'expense') {
        apiUrl = `/api/salesview/expenses/excel?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportName = 'Expenses';
      } else if (reportType === 'refund') {
        apiUrl = `/api/salesview/refunds/excel?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportName = 'Refunds';
      } else if (reportType === 'stockadjustment') {
        apiUrl = `/api/salesview/stock-adjustments/excel?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportName = 'Stock Adjustments';
      } else {
        showToast('Please select Walk-in Invoice, Customer Invoice, Expense or Stock Adjustment report type', 'info');
        setGeneratingExcel(false);
        return;
      }

      const response = await fetch(apiUrl, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();

        if (data.excel) {
          // Decode base64 and trigger download
          const excelContent = atob(data.excel);
          const byteNumbers = new Array(excelContent.length);
          for (let i = 0; i < excelContent.length; i++) {
            byteNumbers[i] = excelContent.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);

          link.setAttribute('href', url);
          link.setAttribute('download', data.filename || `${reportName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showToast(`${reportName} Excel report downloaded successfully!`, 'success');
        } else {
          showToast('No data available for export', 'warning');
        }
      } else {
        showToast('Failed to generate Excel report', 'error');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showToast('Error exporting to Excel', 'error');
    } finally {
      setGeneratingExcel(false);
    }
  };

  // View report
  const viewReport = async () => {
    try {
      setGeneratingPdf(true);

      let apiUrl = '';
      let reportTitleText = '';

      // Determine which report to generate based on reportType
      if (reportType === 'walkin-invoice') {
        apiUrl = `/api/salesview/walkin-invoices/pdf?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportTitleText = 'Walk-in Invoice Report';
      } else if (reportType === 'customer-invoice') {
        apiUrl = `/api/salesview/customized-invoices/pdf?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportTitleText = 'Customer Invoice Payment Report';
      } else if (reportType === 'expense') {
        apiUrl = `/api/salesview/expenses/pdf?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportTitleText = 'Expense Report';
      } else if (reportType === 'refund') {
        apiUrl = `/api/salesview/refunds/pdf?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportTitleText = 'Refund Report';
      } else if (reportType === 'stockadjustment') {
        apiUrl = `/api/salesview/stock-adjustments/pdf?from_date=${fromDate}&to_date=${toDate}&branch=${selectedBranch}`;
        reportTitleText = 'Stock Adjustment Report';
      } else {
        showToast('Please select Walk-in Invoice, Customer Invoice, Expense or Stock Adjustment report type', 'info');
        setGeneratingPdf(false);
        return;
      }

      const response = await fetch(apiUrl, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();

        if (data.pdf) {
          setReportTitle(reportTitleText);
          setReportPdfData(data.pdf);
          setIsReportModalOpen(true);
        } else {
          showToast('No data available for report', 'warning');
        }
      } else {
        showToast('Failed to generate report', 'error');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Error generating report', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    // Auto-fetch on mount with today's date
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    fetchSalesData();
  }, []);

  // Hide tooltip on scroll to prevent misalignment
  useEffect(() => {
    const handleScroll = () => handleHideTooltip();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle three dots hover - show tooltip at root level
  const handleShowTooltip = (e: React.MouseEvent, invoice: WalkInInvoice) => {
    // Clear any pending hide timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + window.scrollY + -75,
      left: rect.left + window.scrollX - 260 // Position to the left of the three dots
    });
    setActiveTooltipInvoice(invoice);
  };

  const handleHideTooltip = () => {
    // Add delay before hiding to prevent flicker
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipPosition(null);
      setActiveTooltipInvoice(null);
      tooltipTimeoutRef.current = null;
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    // Cancel hide timeout when hovering over tooltip
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    handleHideTooltip();
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <PageHeader title="Sales View" />
        {/* Filters Section */}
        <div className="mb-6">
          {/* Mobile: dates in flex row, fetch & branch below */}
          <div className="md:hidden">
            {/* From Date & To Date - side by side on mobile */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="regal-input w-full"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="regal-input w-full"
                />
              </div>
            </div>

            {/* Fetch Button - full width on mobile */}
            <div className="mb-4">
              <button
                onClick={fetchSalesData}
                disabled={loading}
                className="text-regal-black w-full bg-regal-yellow py-3 rounded-md text-sm font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>

            {/* Branch */}
            <div className="mb-4">
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

          {/* Desktop: keep original layout - all in one row */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 mb-4">
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
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={fetchSalesData}
                disabled={loading}
                className="text-regal-black w-24 bg-regal-yellow py-3 rounded-md text-sm font-semibold transition disabled:opacity-50"
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
                disabled={generatingPdf}
                className="bg-regal-yellow text-regal-black px-3 py-3 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPdf ? 'Generating...' : 'View Report'}
              </button>
              <button
                onClick={exportToExcel}
                disabled={generatingExcel}
                className="bg-green-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingExcel ? 'Generating...' : 'Excel Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
          {/* Left Side - Walk-in Invoices */}
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Walk-in Invoices</h2>
            <div className="overflow-x-auto overflow-y-auto" style={{ height: '340px' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-100">
                  <tr className="text-gray-700 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-3 py-5 text-left w-20">Order ID</th>
                    <th className="px-3 py-5 text-left w-40">Product</th>
                    <th className="px-3 py-5 text-left w-20">Price</th>
                    <th className="px-3 py-5 text-center w-20">Amount Paid</th>
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
                          <div className="h-40 bg-gray-200 rounded w-full mx-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ) : walkInInvoices.length === 0 ? (
                    <>
                      <tr>
                        <td colSpan={9} className="py-28 px-44 text-gray-500">
                          No walk-in invoices found
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {walkInInvoices.map((invoice, idx) => {
                        const isRefunded = invoice.is_refunded || false;
                        const rowBgColor = isRefunded 
                          ? 'bg-red-100 hover:bg-red-200' 
                          : 'hover:bg-gray-50';
                        
                        return (
                        <tr 
                          key={`${invoice.id}-${idx}`} 
                          className={`text-sm text-gray-900 border-b border-gray-200 ${isRefunded ? rowBgColor : 'hover:bg-gray-50'}`} 
                          style={{ height: '70px' }}
                          onMouseEnter={() => isRefunded && setHoveredInvoiceId(invoice.id)}
                          onMouseLeave={() => setHoveredInvoiceId(null)}
                        >
                          <td className="px-3 py-4 font-mono text-xs relative">
                            <div className="flex items-center gap-1">
                              {isRefunded && (
                                <span className="w-2 h-2 bg-red-600 rounded-full inline-block" title="Refunded"></span>
                              )}
                              {invoice.invoice_no}
                            </div>
                          </td>
                          <td className="px-3 py-4">{invoice.product_name}</td>
                          <td className="px-2 py-4 text-left">{invoice.total_amount}</td>
                          <td className="px-2 py-4 text-center">{invoice.amount_paid}</td>
                          <td className="px-3 py-4 text-left">{invoice.quantity}</td>
                          <td className="px-2 py-4 text-center">{invoice.discount}</td>
                          <td className="px-2 py-4 text-center">{invoice.total_discount}</td>
                          <td className="px-2 py-4 text-left">{invoice.cost}</td>
                          <td className="px-3 py-4 relative">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const date = new Date(invoice.created_at);
                                const hours = date.getHours();
                                const minutes = date.getMinutes();
                                const seconds = date.getSeconds();
                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                const hours12 = hours % 12 || 12;
                                const minutesStr = minutes.toString().padStart(2, '0');
                                const secondsStr = seconds.toString().padStart(2, '0');
                                return `${hours12}:${minutesStr}:${secondsStr} ${ampm}`;
                              })()}

                              {/* Three dots menu - ONLY on first row (has refund_records) */}
                              {isRefunded && invoice.refund_records && invoice.refund_records.length > 0 && (
                                <div
                                  className="w-6 h-6 flex items-center justify-center cursor-pointer ml-1"
                                  onMouseEnter={(e) => handleShowTooltip(e, invoice)}
                                  onMouseLeave={handleHideTooltip}
                                >
                                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}

                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side - Customized Invoices (Customer Orders with Payments) */}
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-800">
              Customer Invoices
            </h2>
            <div className="overflow-x-auto overflow-y-auto" style={{ height: '340px' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-100">
                  <tr className="text-gray-700 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-3 py-5 text-left w-20">Order ID</th>
                    <th className="px-3 py-5 text-left w-32">Customer</th>
                    <th className="px-3 py-5 text-right w-20">Total</th>
                    <th className="px-3 py-5 text-center w-24" title="Payment received in selected date range">Today&apos;s Pay</th>
                    <th className="px-3 py-5 text-center w-20">Paid (Total)</th>
                    <th className="px-3 py-5 text-right w-20">Pending</th>
                    <th className="px-3 py-5 text-left w-20">Status</th>
                    <th className="px-3 py-5 text-left w-40">Payment Method</th>
                    <th className="px-3 py-5 text-left w-28">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center">
                        <div className="animate-pulse">
                          <div className="h-40 bg-gray-200 rounded w-full mx-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ) : customizedInvoices.length === 0 ? (
                    <>
                      <tr>
                        <td colSpan={9} className="py-28 px-44 text-gray-500">
                          No customer invoices found
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {customizedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="text-sm text-gray-900 border-b border-gray-200" style={{ height: '70px' }}>
                          <td className="px-3 py-4 font-mono text-xs" title={invoice.invoice_no}>
                            {invoice.invoice_no}
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-gray-900">{invoice.customer_name}</div>
                            {invoice.team_name && (
                              <div className="text-xs text-gray-500">Team: {invoice.team_name}</div>
                            )}
                          </td>
                          <td className="px-2 py-4 text-right text-gray-700">
                            {invoice.total_amount.toLocaleString()}
                          </td>
                          <td className="px-2 py-4 text-center font-semibold text-green-700" title="Payment received in selected date range">
                            {invoice.payment_in_selected_range.toLocaleString()}
                          </td>
                          <td className="px-2 py-4 text-right text-gray-700">
                            {invoice.total_paid.toLocaleString()}
                          </td>
                          <td className="px-2 py-4 text-center text-red-700 font-medium">
                            {invoice.pending.toLocaleString()}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(invoice.payment_status)}`}>
                              {invoice.payment_status}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <div className="text-xs">
                              {invoice.payment_methods_used.map((method, idx) => (
                                <span key={idx} className="inline-block px-2 py-2 bg-gray-100 rounded mr-1 mb-1 capitalize">
                                  {method}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-700">
                            {(() => {
                              // Prefer payment_at (actual transaction time) then created_at
                              const timestamp = invoice.payment_at || invoice.created_at;
                              if (!timestamp) return '-';
                              
                              const date = new Date(timestamp);
                              // If date is invalid (e.g. just YYYY-MM-DD without T), fallback to backend payment_time or '-'
                              if (isNaN(date.getTime())) return invoice.payment_time || '-';
                              
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const seconds = date.getSeconds();
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const hours12 = hours % 12 || 12;
                              const minutesStr = minutes.toString().padStart(2, '0');
                              const secondsStr = seconds.toString().padStart(2, '0');
                              return `${hours12}:${minutesStr}:${secondsStr} ${ampm}`;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

       {/* Total Sales Summary - Walk-in + Customer Invoices */}
        
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Walk-in Invoices Total */}
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Walk-in Invoices</p>
              <p className="text-2xl font-bold">
                Rs. {summary.walkin_sales?.toLocaleString() || 0}
              </p>
            </div>

            {/* Customer Invoices Total */}
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Customer Invoices</p>
              <p className="text-2xl font-bold">
                Rs. {summary.customer_payments?.toLocaleString() || 0}
              </p>
            </div>
          </div>
       

        {/* Summary Footer - Original UI Style */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-600 font-bold text-xl">
            <div className="flex items-center gap-1">
              <p>Opening:</p>
              <p>{summary?.opening?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Sale:</p>
              <p>{summary?.totalSale?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Vendor Payments:</p>
              <p>{summary?.vendorPayments?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Expense:</p>
              <p>{summary?.totalExpense?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Refund:</p>
              <p>{summary?.totalRefund?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Net Cash:</p>
              <p>{summary?.netCash?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Total Purchase:</p>
              <p>{summary?.totalPurchase?.toLocaleString() || 0}</p>
            </div>
            <div className="flex items-center gap-1">
              <p>Net Profit:</p>
              <p>{summary?.netProfit?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        {/* Root-level Tooltip for Refund Info - Renders outside scroll container */}
        {activeTooltipInvoice && tooltipPosition && (
          <div
            className="fixed"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              zIndex: 999999
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg py-3 px-4 shadow-2xl min-w-[280px] max-w-[350px] border-2 border-red-500">
              <div className="font-bold text-red-300 mb-2 text-base">⚠ Refunded</div>
              <div className="space-y-3">
                {activeTooltipInvoice.refund_records && activeTooltipInvoice.refund_records.length > 0 ? (
                  activeTooltipInvoice.refund_records.map((record, idx) => (
                    <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-600' : ''}>
                      <div className="font-semibold text-yellow-300 mb-1">
                        {new Date(record.refund_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div><span className="text-gray-400">Amount:</span> Rs. {record.refund_amount.toFixed(2)}</div>
                      {record.refund_reason && (
                        <div><span className="text-gray-400">Reason:</span> {record.refund_reason}</div>
                      )}
                      {record.refund_items && record.refund_items.length > 0 && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-400 mb-1">Items:</div>
                          {record.refund_items.map((item, i) => (
                            <div key={i} className="mb-1">
                              <span className="text-white">• {item.product_name}</span>
                              <span className="text-green-400 font-bold ml-2">Qty: {item.quantity_returned}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No refund details available</div>
                )}
              </div>
              {/* Arrow */}
              <div className="absolute -top-2 left-8">
                <div className="w-3 h-3 bg-gray-900 rotate-45 border-t-2 border-l-2 border-red-500"></div>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportPdfData('');
          }}
          title={reportTitle}
          pdfData={reportPdfData}
        />
    </div>
  );
};

export default SalesViewPage;
