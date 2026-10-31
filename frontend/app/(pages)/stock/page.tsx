'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import DateRangeModal from '@/components/ui/DateRangeModal';
import PageHeader from '@/components/ui/PageHeader';
import { useBranch } from '@/lib/branch';
import SearchBox from '@/components/ui/SearchBox';
import { useBatchLines, shopLinesUrl, ShopBatchLine, rangeText, plainAmount } from '@/lib/batchLines';

interface StockItem {
  pro_id: string;
  batch_count?: number;
  // Lowest / highest over the batch lines (only with batches)
  price_range?: [number, number] | null;
  cost_range?: [number, number] | null;
  margin_range?: [number, number] | null;
  vendor_name: string;
  product_name: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  barcode: string;
  margin: number;
  brand: string;
  branch: string;
}

const StockPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStockInReportModal, setShowStockInReportModal] = useState(false);
  const [stockInReportUrl, setStockInReportUrl] = useState<string>('');
  // Rows with batches open on click to their Old Stock + batch lines (this branch's stock)
  const { lines: openLines, toggle: toggleBatches } = useBatchLines<ShopBatchLine>((message) => showToast(message, 'error'), shopLinesUrl);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages
  const totalPages = totalPagesFromApi;

  // Branch options: the branch this user is logged into
  const currentBranch = useBranch();
  const branchOptions = currentBranch ? [currentBranch.name] : [];

  // Fetch stock
  const fetchStock = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/stock/viewstock?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const stockList = data.data || [];
        const total = data.total || 0;
        const totalPages = data.total_pages || 0;

        setStockItems(stockList);
        setTotalItems(total);
        setTotalPagesFromApi(totalPages);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch stock', 'error');
      }
    } catch (error: any) {
      console.error('Error fetching stock:', error);
      showToast(error.message || 'Failed to fetch stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock on page change or search term change
  useEffect(() => {
    fetchStock();
  }, [currentPage, pageSize, searchTerm]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle stock-in report generation (PDF)
  const handleStockInReport = async (dateFrom: string, dateTo: string) => {
    // Build URL with date params
    const reportUrl = `/api/stock/stockinreport?date_from=${dateFrom}&date_to=${dateTo}`;
    setStockInReportUrl(reportUrl);
    setShowStockInReportModal(false);
  };

  // Handle stock-in report generation (Excel) - use for heavy date ranges where PDF won't open
  const handleStockInReportExcel = async (dateFrom: string, dateTo: string) => {
    try {
      const response = await fetch(`/api/stock/stockinreportexcel?date_from=${dateFrom}&date_to=${dateTo}`, {
        method: 'POST',
        credentials: 'include',
      });

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
          link.setAttribute('download', `Stock_In_Report_${dateFrom}_to_${dateTo}.xlsx`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setShowStockInReportModal(false);
          showToast('Stock In Excel report downloaded successfully!', 'success');
        } else {
          showToast('No data available for export', 'warning');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to generate Excel report', 'error');
      }
    } catch (error) {
      console.error('Error exporting stock-in report to Excel:', error);
      showToast('Error exporting to Excel', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      setGeneratingExcel(true);
      const response = await fetch('/api/stock/stockreportexcel', {
        method: 'POST',
        credentials: 'include',
      });

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

          const date = new Date().toISOString().split('T')[0];
          link.setAttribute('href', url);
          link.setAttribute('download', `Stock_Report_${date}.xlsx`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showToast('Stock Excel report downloaded successfully!', 'success');
        } else {
          showToast('No data available for export', 'warning');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to generate Excel report', 'error');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showToast('Error exporting to Excel', 'error');
    } finally {
      setGeneratingExcel(false);
    }
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="View Stock" />

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        {/* Left side - Action Buttons */}
        <div className="flex flex-wrap gap-2 min-w-0">
          <button
            onClick={() => router.push('/stock/stockin')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            + Add Stock
          </button>

          {/* <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Stock Details
          </button> */}

          <button
            onClick={handleExportExcel}
            disabled={generatingExcel}
            className={`regal-btn bg-regal-yellow text-regal-black whitespace-nowrap ${generatingExcel ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {generatingExcel ? 'Exporting...' : 'Stock Details'}
          </button>

          <button
            onClick={() => setShowStockInReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Stock In Report
          </button>

          <button
            onClick={() => router.push('/stock/adjust')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Adjust Stock
          </button>

          <button
            onClick={() => router.push('/stock/transfer')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Transfer Stock
          </button>
        </div>

        {/* Right side - Search */}
        {/* Fixed width + items-start: the 5 buttons wrap instead of squeezing the search
            box (squeezed, the icon dropped below it and Clear stretched to the row height) */}
        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          resetPage={() => setCurrentPage(1)}
          id="searchInput"
          placeholder="Search by product name or barcode..."
          boxClassName="relative flex-1 sm:flex-none sm:w-72"
          clearWrapperClassName="w-full sm:w-auto sm:shrink-0 flex items-start gap-2"
        />
      </div>

      {/* Stock Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100 border-b">
                <tr className='text-xs text-gray-900 uppercase tracking-wider font-semibold'>
                  <th className="px-3 py-5 text-left w-12">S.No</th>
                  <th className="px-2 py-5 text-left w-24">Vendor</th>
                  <th className="px-2 py-5 text-left w-44">Product</th>
                  <th className="px-2 py-5 text-left w-40">Category</th>
                  <th className="px-2 py-5 w-20">Stock</th>
                  {/* Wide enough for a batch range "1210.00 – 2930.00" */}
                  <th className="px-2 py-5 w-40">Price</th>
                  <th className="px-2 py-5 w-40">Cost</th>
                  <th className="px-2 py-5 text-left w-32">Barcode</th>
                  <th className="px-2 py-5 w-32">Margin (%)</th>
                  <th className="px-2 py-5 text-left w-28">Brand</th>
                  <th className="px-2 py-5 text-left w-32">Branch</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockItems.map((item, index) => (
                  <React.Fragment key={item.pro_id}>
                  <tr
                    onClick={() => item.batch_count && toggleBatches(item.pro_id)}
                    className={`text-sm text-gray-900 ${item.batch_count ? 'cursor-pointer' : ''} ${item.pro_id in openLines ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-3 py-4 ${item.pro_id in openLines ? 'border-l-4 border-regal-yellow' : ''}`}>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">{item.vendor_name || '-'}</td>
                    <td className="px-2 py-4">
                      {item.product_name}
                      {!!item.batch_count && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-regal-black whitespace-nowrap">
                          {item.batch_count} batch{item.batch_count > 1 ? 'es' : ''} {item.pro_id in openLines ? '▲' : '▼'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">{item.category || '-'}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.stock}</td>
                    {/* With batches: lowest – highest of its lines (each line's own values below) */}
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.price_range ? rangeText(item.price_range, plainAmount) : plainAmount(item.price)}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.cost_range ? rangeText(item.cost_range, plainAmount) : plainAmount(item.cost)}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{item.barcode || '-'}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.margin_range ? rangeText(item.margin_range, (n) => `${n.toFixed(1)}%`) : `${item.margin.toFixed(1)}%`}</td>
                    <td className="px-2 py-4">{item.brand || '-'}</td>
                    <td className="px-2 py-4">{item.branch || '-'}</td>
                  </tr>
                  {/* Batch lines under the same columns: Old Stock + each batch */}
                  {item.pro_id in openLines && openLines[item.pro_id] === null && (
                    <tr className="bg-gray-50 text-sm text-gray-500">
                      <td></td>
                      <td colSpan={10} className="px-2 py-2">Loading batches...</td>
                    </tr>
                  )}
                  {(openLines[item.pro_id] || []).map((line, lineIndex) => (
                    <tr key={line.label + (line.barcode || '')} className="bg-gray-50 text-sm text-gray-700">
                      {/* 1.1, 1.2 ... under the product's S.No; ├ / └ ties the line to the product above */}
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap border-l-4 border-regal-yellow">
                        <span className="font-mono text-gray-400 mr-1">{lineIndex === (openLines[item.pro_id] || []).length - 1 ? '└' : '├'}</span>
                        {(currentPage - 1) * pageSize + index + 1}.{lineIndex + 1}
                      </td>
                      <td className="px-2 py-2">{line.vendor_name || '-'}</td>
                      <td className="px-2 py-2">
                        <div>{item.product_name}</div>
                        <span className="text-xs font-semibold text-regal-black">{line.label}</span>
                      </td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2 text-center font-semibold">{line.stock}</td>
                      <td className="px-2 py-2 text-center">{plainAmount(line.selling_price)}</td>
                      <td className="px-2 py-2 text-center">{plainAmount(line.cost)}</td>
                      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{line.barcode || '-'}</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stockItems.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No stock items found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/stock"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Stock Details Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Stock Details"
        reportUrl="/api/stock/stockreport"
      />

      {/* Stock In Report Date Range Modal */}
      <DateRangeModal
        isOpen={showStockInReportModal}
        onClose={() => setShowStockInReportModal(false)}
        onSubmit={handleStockInReport}
        onSubmitExcel={handleStockInReportExcel}
        title="Stock In Report"
      />

      {/* Stock In Report PDF Display Modal */}
      <ReportModal
        isOpen={!!stockInReportUrl}
        onClose={() => {
          setStockInReportUrl('');
          setShowStockInReportModal(true);
        }}
        title="Stock In Report"
        reportUrl={stockInReportUrl}
      />
    </div>
  );
};

export default StockPage;
