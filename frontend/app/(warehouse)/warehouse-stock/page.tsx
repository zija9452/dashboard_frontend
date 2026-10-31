'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';
import DateRangeModal from '@/components/ui/DateRangeModal';
import { warehouseStockApi, StockItem } from '@/lib/api/warehouse-stock';
import SearchBox from '@/components/ui/SearchBox';
import { useBatchLines, rangeText } from '@/lib/batchLines';

const WarehouseStockPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // View mode state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);
  const totalPages = totalPagesFromApi;

  // Rows with batches open on click to their Old Stock + batch lines
  const { lines: openLines, toggle: toggleBatches } = useBatchLines((message) => showToast(message, 'error'));

  const [showStockInReportModal, setShowStockInReportModal] = useState(false);
  const [stockInReportUrl, setStockInReportUrl] = useState<string>('');

  // Fetch stock on page change or search term change
  useEffect(() => {
    fetchStock();
  }, [currentPage, searchTerm]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await warehouseStockApi.getStock(currentPage, pageSize, searchTerm || undefined);

      setStockItems(response.data);
      setTotalItems(response.total);
      setTotalPagesFromApi(response.totalPages);
    } catch (error: any) {
      console.error('Error fetching warehouse stock:', error);
      showToast('Failed to fetch warehouse stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle stock-in report generation
  const handleStockInReport = async (dateFrom: string, dateTo: string) => {
    // Build URL with date params for warehouse stock-in report
    const reportUrl = `/api/warehouse-stock/stockinreport?date_from=${dateFrom}&date_to=${dateTo}`;
    setStockInReportUrl(reportUrl);
    setShowStockInReportModal(false);
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Warehouse Stock" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/warehouse-stock/warehouse-stockin')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            + Stock In
          </button>

          <button
            onClick={() => setShowStockInReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Stock In Report
          </button>

          <button
            onClick={() => router.push('/warehouse-stock/warehouse-adjust')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Adjust Stock
          </button>
        </div>

        {/* Right side - Search */}
        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          resetPage={() => setCurrentPage(1)}
          id="searchInput"
          placeholder="Search by product name, barcode, SKU..."
          clearWrapperClassName="w-full sm:w-auto flex gap-2"
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
                  <th className="px-2 py-5 text-left w-32">Vendor</th>
                  <th className="px-2 py-5 text-left w-52">Product</th>
                  <th className="px-2 py-5 text-left w-36">Barcode</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 w-24">Warehouse Stock</th>
                  <th className="px-2 py-5 w-24">Warehouse Cost</th>
                  <th className="px-2 py-5 w-28">Warehouse Limited Qty</th>
                  <th className="px-2 py-5 text-left w-28">Article No</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                  <tr
                    onClick={() => item.batch_count && toggleBatches(item.id)}
                    className={`text-sm text-gray-900 ${item.batch_count ? 'cursor-pointer' : ''} ${item.id in openLines ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-3 py-4 ${item.id in openLines ? 'border-l-4 border-regal-yellow' : ''}`}>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">{item.vendor_name || '-'}</td>
                    <td className="px-2 py-4">
                      {item.name}
                      {!!item.batch_count && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-regal-black whitespace-nowrap">
                          {item.batch_count} batch{item.batch_count > 1 ? 'es' : ''} {item.id in openLines ? '▲' : '▼'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4">{item.barcode || '-'}</td>
                    <td className="px-2 py-4">{item.category || '-'}</td>
                    <td className="px-2 py-4 text-center">
                      <span className={`font-semibold ${
                        (item.warehouse_stock || 0) <= (item.warehouse_limited_qty || 0)
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {item.warehouse_stock || 0}
                      </span>
                    </td>
                    {/* With batches: lowest – highest cost of its lines (each line's own cost below) */}
                    <td className="px-2 py-4 text-center whitespace-nowrap">{item.warehouse_cost_range ? rangeText(item.warehouse_cost_range) : item.warehouse_cost || 0}</td>
                    <td className="px-2 py-4 text-center">{item.warehouse_limited_qty || 0}</td>
                    <td className="px-2 py-4 text-center">{item.article_no || '-'}</td>
                  </tr>
                  {/* Batch lines under the same columns: Old Stock + each vendor batch */}
                  {item.id in openLines && openLines[item.id] === null && (
                    <tr className="bg-gray-50 text-sm text-gray-500">
                      <td></td>
                      <td colSpan={8} className="px-2 py-2">Loading batches...</td>
                    </tr>
                  )}
                  {(openLines[item.id] || []).map((line, lineIndex) => (
                    <tr key={line.label + (line.barcode || '')} className="bg-gray-50 text-sm text-gray-700">
                      {/* 1.1, 1.2 ... under the product's S.No */}
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap border-l-4 border-regal-yellow">
                        {/* ├ / └ ties the line to the product above */}
                        <span className="font-mono text-gray-400 mr-1">{lineIndex === (openLines[item.id] || []).length - 1 ? '└' : '├'}</span>
                        {(currentPage - 1) * pageSize + index + 1}.{lineIndex + 1}
                      </td>
                      <td className="px-2 py-2">{line.vendor_name || '-'}</td>
                      <td className="px-2 py-2">
                        <div>{item.name}</div>
                        <span className="text-xs font-semibold text-regal-black">{line.label}</span>
                        {line.status === 'CLOSED' && <span className="ml-1 text-xs text-gray-500">(closed)</span>}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{line.barcode || '-'}</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2 text-center font-semibold">{line.warehouse_stock}</td>
                      <td className="px-2 py-2 text-center">
                        {/* The cost as entered; freight / cartage / markup only go into the selling price */}
                        {line.cost.toLocaleString()}
                      </td>
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
            No warehouse stock items found.
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
            baseUrl="/warehouse-stock"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Stock In Report Date Range Modal */}
      <DateRangeModal
        isOpen={showStockInReportModal}
        onClose={() => setShowStockInReportModal(false)}
        onSubmit={handleStockInReport}
        title="Warehouse Stock In Report"
      />

      {/* Stock In Report PDF Display Modal */}
      <ReportModal
        isOpen={!!stockInReportUrl}
        onClose={() => {
          setStockInReportUrl('');
          setShowStockInReportModal(true);
        }}
        title="Warehouse Stock In Report"
        reportUrl={stockInReportUrl}
      />
    </div>
  );
};

export default WarehouseStockPage;
