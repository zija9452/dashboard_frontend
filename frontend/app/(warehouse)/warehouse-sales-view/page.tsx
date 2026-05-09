'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

// Warehouse Invoice interface (item-wise row)
interface WarehouseInvoiceRow {
  id: string;
  invoice_no: string;
  product_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  quantity: number;
  discount: number;
  total_discount: number;
  cost: number;
  created_at: string;
  customer_name: string;
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
  warehouse_sales?: number;
}

const WarehouseSalesViewPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Filter states
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<string>('warehouse-invoice');

  // Data states
  const [invoices, setInvoices] = useState<WarehouseInvoiceRow[]>([]);
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
    warehouse_sales: 0,
  });

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportPdfData, setReportPdfData] = useState<string>('');

  // Report type options
  const reportOptions = [
    { value: 'warehouse-invoice', label: 'Warehouse Invoice' },
    { value: 'warehouse-adjustment-stock', label: 'Warehouse Stock Adjustment' },
  ];

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const [invoicesResponse, summaryResponse] = await Promise.all([
        fetch(
          `/api/warehouse-invoice/sales-view?from_date=${fromDate}&to_date=${toDate}`,
          { credentials: 'include' }
        ),
        fetch(
          `/api/warehouse-invoice/summary?from_date=${fromDate}&to_date=${toDate}`,
          { credentials: 'include' }
        )
      ]);

      const invoicesData = await invoicesResponse.json();
      const summaryData = await summaryResponse.json();

      setInvoices(invoicesData.invoices || []);
      setSummary(summaryData);

      showToast('Warehouse sales data fetched successfully', 'success');
    } catch (error) {
      console.error('Error fetching warehouse sales data:', error);
      showToast('Failed to fetch warehouse sales data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Report generation loading states
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setGeneratingExcel(true);

      let apiUrl = `/api/warehouse-invoice/sales-view/excel?from_date=${fromDate}&to_date=${toDate}`;
      let reportName = 'Warehouse Invoices';

      if (reportType === 'warehouse-adjustment-stock') {
        apiUrl = `/api/warehouse-stock/adjustment-report/excel?from_date=${fromDate}&to_date=${toDate}`;
        reportName = 'Warehouse Stock Adjustments';
      }

      const response = await fetch(apiUrl, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();

        if (data.excel) {
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

      let apiUrl = `/api/warehouse-invoice/sales-view/pdf?from_date=${fromDate}&to_date=${toDate}`;
      let reportTitleText = 'Warehouse Sales Report';

      if (reportType === 'warehouse-adjustment-stock') {
        apiUrl = `/api/warehouse-stock/adjustment-report/pdf?from_date=${fromDate}&to_date=${toDate}`;
        reportTitleText = 'Warehouse Stock Adjustment Report';
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
    fetchSalesData();
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

  return (
    <div className="p-4 bg-white min-h-screen pt-14 md:pt-0">
      <PageHeader title="Warehouse Sales View" />
        {/* Filters Section */}
        <div className="mb-6">
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
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Warehouse Invoices</h2>
          <div className="overflow-x-auto overflow-y-auto border border-gray-200 rounded" style={{ height: '400px' }}>
            <table className="w-full table-fixed">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="text-gray-700 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-3 py-5 text-left w-20">Order ID</th>
                  <th className="px-3 py-5 text-left w-40">Product</th>
                  <th className="px-3 py-5 text-left w-32">Customer</th>
                  <th className="px-3 py-5 text-left w-20">Cost</th>
                  <th className="px-3 py-5 text-left w-20">Price</th>
                  <th className="px-3 py-5 text-left w-16">Qty</th>
                  <th className="px-3 py-5 text-left w-20">Discount</th>
                  <th className="px-3 py-5 text-center w-20">Amount Paid</th>
                  
                  
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
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-28 text-center text-gray-500">
                      No warehouse invoices found
                    </td>
                  </tr>
                ) : (
                  <>
                    {invoices.map((invoice, idx) => (
                      <tr 
                        key={`${invoice.id}-${idx}`} 
                        className="text-sm text-gray-900 border-b border-gray-200 hover:bg-gray-50" 
                        style={{ height: '70px' }}
                      >
                        <td className="px-3 py-4 font-mono text-xs">
                          {invoice.invoice_no}
                        </td>
                        <td className="px-3 py-4">{invoice.product_name}</td>
                        <td className="px-3 py-4">{invoice.customer_name}</td>
                        <td className="px-2 py-4 text-left">{invoice.cost.toLocaleString()}</td>
                        <td className="px-2 py-4 text-left">{invoice.total_amount}</td>
                        <td className="px-3 py-4 text-left">{invoice.quantity}</td>
                        <td className="px-2 py-4 text-center">{invoice.discount > 0 ? invoice.discount : '0'}</td>
                        <td className="px-2 py-4 text-center font-semibold text-green-700">
                          {invoice.amount_paid > 0 ? invoice.amount_paid.toLocaleString() : '0'}
                        </td>
                        
                        
                        <td className="px-3 py-4">
                          {(() => {
                            const date = new Date(invoice.created_at);
                            if (isNaN(date.getTime())) return '-';
                            return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Total Warehouse Sales</p>
            <p className="text-2xl font-bold">
              Rs. {summary.totalSale?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Net Profit</p>
            <p className="text-2xl font-bold text-green-700">
              Rs. {summary.netProfit?.toLocaleString() || 0}
            </p>
          </div>
        </div>

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

export default WarehouseSalesViewPage;
