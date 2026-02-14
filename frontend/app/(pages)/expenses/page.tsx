'use client';

import React, { useState, useEffect } from 'react';
import Pagination from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Define expense interface
interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  expense_date: string;
  note?: string;
  created_by: string;
  branch: string;
  created_at: string;
}

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
    const fetchExpenses = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockExpenses: Expense[] = [
          { id: '1', expense_type: 'Office Supplies', amount: 150.00, expense_date: '2026-02-01', note: 'Pens, paper, stapler', created_by: 'admin', branch: 'Main Branch', created_at: '2026-02-01T10:00:00.000Z' },
          { id: '2', expense_type: 'Utilities', amount: 300.00, expense_date: '2026-02-01', note: 'Electricity bill', created_by: 'admin', branch: 'Main Branch', created_at: '2026-02-01T11:00:00.000Z' },
          { id: '3', expense_type: 'Rent', amount: 1200.00, expense_date: '2026-02-01', note: 'February rent', created_by: 'admin', branch: 'Main Branch', created_at: '2026-02-01T12:00:00.000Z' },
          { id: '4', expense_type: 'Marketing', amount: 500.00, expense_date: '2026-02-02', note: 'Social media ads', created_by: 'manager', branch: 'Downtown Branch', created_at: '2026-02-02T09:00:00.000Z' },
          { id: '5', expense_type: 'Travel', amount: 250.00, expense_date: '2026-02-02', note: 'Client meeting trip', created_by: 'sales', branch: 'Main Branch', created_at: '2026-02-02T14:00:00.000Z' },
          { id: '6', expense_type: 'Software License', amount: 100.00, expense_date: '2026-02-03', note: 'POS software renewal', created_by: 'admin', branch: 'Main Branch', created_at: '2026-02-03T10:30:00.000Z' },
          { id: '7', expense_type: 'Equipment', amount: 800.00, expense_date: '2026-02-03', note: 'New computer', created_by: 'admin', branch: 'West Branch', created_at: '2026-02-03T15:45:00.000Z' },
          { id: '8', expense_type: 'Maintenance', amount: 75.00, expense_date: '2026-02-04', note: 'Printer maintenance', created_by: 'staff', branch: 'East Branch', created_at: '2026-02-04T11:20:00.000Z' },
        ];

        setExpenses(mockExpenses);
        setTotalItems(mockExpenses.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
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
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search expenses..."
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

      {/* Expenses Table */}
      <div className="overflow-x-auto">
        <table className="regal-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.expense_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${expense.amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(expense.expense_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.branch}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.note || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.created_by}</td>
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
          baseUrl="/expenses"
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {expenses.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No expenses found.</p>
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

export default ExpensesPage;