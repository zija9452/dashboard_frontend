'use client';

import React, { useState, useEffect } from 'react';
import Pagination from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define salesman interface
interface Salesman {
  id: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  branch: string;
  commission_rate: number;
}

const SalesmanPage: React.FC = () => {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
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
    const fetchSalesmen = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockSalesmen: Salesman[] = [
          { id: '1', name: 'John Smith', code: 'SM001', phone: '123-456-7890', branch: 'Main Branch', commission_rate: 5.0 },
          { id: '2', name: 'Jane Doe', code: 'SM002', phone: '098-765-4321', branch: 'Downtown Branch', commission_rate: 7.5 },
          { id: '3', name: 'Bob Johnson', code: 'SM003', phone: '555-555-5555', branch: 'West Branch', commission_rate: 6.0 },
          { id: '4', name: 'Alice Williams', code: 'SM004', phone: '111-222-3333', branch: 'East Branch', commission_rate: 4.5 },
          { id: '5', name: 'Charlie Brown', code: 'SM005', phone: '444-555-6666', branch: 'North Branch', commission_rate: 8.0 },
          { id: '6', name: 'Diana Miller', code: 'SM006', phone: '777-888-9999', branch: 'South Branch', commission_rate: 5.5 },
          { id: '7', name: 'Edward Davis', code: 'SM007', phone: '333-444-5555', branch: 'Central Branch', commission_rate: 7.0 },
          { id: '8', name: 'Fiona Garcia', code: 'SM008', phone: '666-777-8888', branch: 'Main Branch', commission_rate: 6.5 },
        ];

        setSalesmen(mockSalesmen);
        setTotalItems(mockSalesmen.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch salesmen');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesmen();
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
      <h1 className="text-2xl font-bold mb-6">Salesmen</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search salesmen..."
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

      {/* Salesmen Table */}
      <div className="overflow-x-auto">
        <table className="regal-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesmen.map((salesman) => (
              <tr key={salesman.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.phone || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.branch}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.commission_rate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
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
          baseUrl="/salesman"
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {salesmen.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No salesmen found.</p>
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

export default SalesmanPage;