'use client';

import React, { useState, useEffect } from 'react';
import Pagination from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define stock interface
interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  branch: string;
  vendor_name: string;
  price: number;
  cost: number;
  barcode?: string;
  discount: number;
  category: string;
  brand: string;
  image?: string;
}

const StockPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calculate totalPages based on totalItems and pageSize
  const totalPages = Math.ceil(totalItems / pageSize);

  // Simulated data fetch
  useEffect(() => {
    // In a real app, this would be an API call
    const fetchStock = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockStockItems: StockItem[] = [
          { id: '1', product_id: 'prod-1', product_name: 'T-Shirt', quantity: 50, branch: 'Main Branch', vendor_name: 'ABC Suppliers', price: 25.00, cost: 15.00, barcode: '1234567890123', discount: 0.0, category: 'Clothing', brand: 'Generic' },
          { id: '2', product_id: 'prod-2', product_name: 'Jeans', quantity: 30, branch: 'Main Branch', vendor_name: 'XYZ Distributors', price: 50.00, cost: 30.00, barcode: '2345678901234', discount: 0.0, category: 'Clothing', brand: 'Designer' },
          { id: '3', product_id: 'prod-3', product_name: 'Sneakers', quantity: 20, branch: 'Downtown Branch', vendor_name: 'Global Imports', price: 80.00, cost: 50.00, barcode: '3456789012345', discount: 0.0, category: 'Footwear', brand: 'Brand A' },
          { id: '4', product_id: 'prod-4', product_name: 'Watch', quantity: 15, branch: 'West Branch', vendor_name: 'Local Goods Co.', price: 150.00, cost: 100.00, barcode: '4567890123456', discount: 0.0, category: 'Accessories', brand: 'Premium' },
          { id: '5', product_id: 'prod-5', product_name: 'Backpack', quantity: 25, branch: 'East Branch', vendor_name: 'Premium Vendors', price: 40.00, cost: 25.00, barcode: '5678901234567', discount: 0.0, category: 'Accessories', brand: 'Generic' },
          { id: '6', product_id: 'prod-6', product_name: 'Sunglasses', quantity: 40, branch: 'North Branch', vendor_name: 'Quality Merchants', price: 30.00, cost: 18.00, barcode: '6789012345678', discount: 0.0, category: 'Accessories', brand: 'Fashion' },
          { id: '7', product_id: 'prod-7', product_name: 'Hat', quantity: 35, branch: 'South Branch', vendor_name: 'Bulk Providers', price: 20.00, cost: 12.00, barcode: '7890123456789', discount: 0.0, category: 'Clothing', brand: 'Generic' },
          { id: '8', product_id: 'prod-8', product_name: 'Belt', quantity: 30, branch: 'Main Branch', vendor_name: 'Trusted Sources', price: 25.00, cost: 15.00, barcode: '8901234567890', discount: 0.0, category: 'Accessories', brand: 'Leather' },
        ];

        setStock(mockStockItems);
        setTotalItems(mockStockItems.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock items');
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [currentPage, pageSize, searchTerm]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
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
      <h1 className="text-2xl font-bold mb-6">Stock Management</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stock items..."
            className="regal-input flex-grow"
          />
          <button type="submit" className="regal-btn">Search</button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="regal-btn bg-gray-500 hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Stock Table */}
      <div className="overflow-x-auto">
        <table className="regal-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stockItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.branch}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.vendor_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">Adjust</button>
                  <button className="text-green-600 hover:text-green-900 mr-3">Add</button>
                  <button className="text-red-600 hover:text-red-900">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          baseUrl="/stock"
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {stockItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No stock items found.</p>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="regal-btn mt-4"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StockPage;