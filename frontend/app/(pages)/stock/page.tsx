'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import PageHeader from '@/components/ui/PageHeader';

interface StockItem {
  pro_id: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages - limit to max 5 pages
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

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

  return (
    <div className="p-6">
      <PageHeader title="View Stock" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/stock/stockin')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            + Add Stock
          </button>

          <button
            onClick={() => router.push('/stock/adjust')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Adjust Stock
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Stock Report
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="searchInput"
              type="text"
              placeholder="Search by product name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                }
              }}
              className="regal-input w-full pl-10 pr-4 py-2"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
              document.getElementById('searchInput')?.focus();
            }}
          >
            Clear
          </button>
        </div>
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
                  <th className="px-2 py-5 text-left w-40">Product</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 w-20">Stock</th>
                  <th className="px-2 py-5 w-24">Price</th>
                  <th className="px-2 py-5 w-24">Cost</th>
                  <th className="px-2 py-5 text-left w-24">Barcode</th>
                  <th className="px-2 py-5 w-24">Margin (%)</th>
                  <th className="px-2 py-5 text-left w-28">Brand</th>
                  <th className="px-2 py-5 text-left w-32">Branch</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockItems.map((item, index) => (
                  <tr key={item.pro_id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">{item.vendor_name || '-'}</td>
                    <td className="px-2 py-4">{item.product_name}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{item.category || '-'}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.stock}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.price.toFixed(2)}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.cost.toFixed(2)}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{item.barcode || '-'}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">{item.margin.toFixed(1)}%</td>
                    <td className="px-2 py-4">{item.brand || '-'}</td>
                    <td className="px-2 py-4">{item.branch || '-'}</td>
                  </tr>
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

      {/* Stock Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Stock Report"
        reportUrl="/api/stock/stockreport"
      />
    </div>
  );
};

export default StockPage;
