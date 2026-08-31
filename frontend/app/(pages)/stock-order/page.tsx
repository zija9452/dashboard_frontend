'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface StockOrderProduct {
  id: string;
  name: string;
  barcode: string;
  category: string;
  stock: number;
}

type StockFilter = 'zero' | 'short' | 'all';

const StockOrderPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<StockFilter>(
    (searchParams.get('filter') as StockFilter) || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [products, setProducts] = useState<StockOrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({});
  const [placingOrderId, setPlacingOrderId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const filterLabels: Record<StockFilter, string> = {
    zero: 'Zero Stock',
    short: 'Short Stock',
    all: 'All Products',
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('filter', filter);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/shoporder/stock-list?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.total_pages || 0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch products', 'error');
      }
    } catch (error) {
      console.error('Error fetching stock order products:', error);
      showToast('Error fetching products', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (newFilter: StockFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    router.replace(`/stock-order?filter=${newFilter}`);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    setOrderQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  const handlePlaceOrder = async (product: StockOrderProduct) => {
    const rawQty = orderQuantities[product.id];
    const qty = parseInt(rawQty, 10);

    if (!rawQty || isNaN(qty) || qty <= 0) {
      showToast('Enter a valid order quantity', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Place Order',
      text: `Place order for ${qty} unit(s) of ${product.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, place order',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
    });

    if (!result.isConfirmed) return;

    setPlacingOrderId(product.id);
    try {
      const response = await fetch('/api/shoporder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: product.id, quantity_ordered: qty }),
      });

      if (response.ok) {
        Swal.fire({
          title: 'Order Placed!',
          text: `Order for ${qty} unit(s) of ${product.name} has been placed.`,
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        setOrderQuantities((prev) => ({ ...prev, [product.id]: '' }));
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to place order', 'error');
      }
    } catch (error) {
      console.error('Error placing shop order:', error);
      showToast('Error placing order', 'error');
    } finally {
      setPlacingOrderId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Stock Order" />

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>

          {showSearch && (
            <div className="flex gap-2 mt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setCurrentPage(1);
                    }
                  }}
                  className="regal-input w-full pl-10 pr-4 py-4"
                  autoFocus
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
            </div>
          )}
        </div>

        {/* Stock filter - top right */}
        <div className="flex gap-2">
          {(['zero', 'short', 'all'] as StockFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-regal-yellow text-regal-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="border-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">S.No</th>
                  <th className="px-3 py-5 text-left w-48">Product Name</th>
                  <th className="px-3 py-5 text-left w-32">Barcode</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-left w-24">Current Stock</th>
                  <th className="px-3 py-5 text-left w-32">Order Quantity</th>
                  <th className="px-3 py-5 text-left w-32">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.id} className="text-sm text-gray-900 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4 font-medium">{product.name}</td>
                    <td className="px-3 py-4">{product.barcode || '-'}</td>
                    <td className="px-3 py-4">{product.category || 'N/A'}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={product.stock <= 0 ? 'text-red-600 font-semibold' : 'text-yellow-700 font-semibold'}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min={1}
                        value={orderQuantities[product.id] || ''}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        className="regal-input w-24 py-1"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => handlePlaceOrder(product)}
                        disabled={placingOrderId === product.id}
                        className={`regal-btn px-3 py-1.5 text-sm ${
                          placingOrderId === product.id
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-regal-yellow text-regal-black'
                        }`}
                      >
                        {placingOrderId === product.id ? 'Placing...' : 'Place Order'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <p className="text-center py-12 text-gray-500">No products found</p>
            )}
          </div>

          {totalPagesFromApi > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesFromApi}
                totalItems={totalItems}
                pageSize={pageSize}
                baseUrl="/stock-order"
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockOrderPage;
