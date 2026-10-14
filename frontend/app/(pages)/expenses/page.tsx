'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import { useBranch } from '@/lib/branch';

interface Expense {
  id: string;
  expense: string;
  amount: number;
  expense_date: string;
  branch: string;
  created_by: string;
  created_at: string;
  is_monthly: boolean;
}

type ExpenseKind = 'all' | 'daily' | 'monthly';

// Summary cards (admin only): today's Daily, the selected month's Daily and Monthly totals
interface ExpenseCards {
  todayDaily: number;
  monthDaily: number;
  monthMonthly: number;
}

// Quick picks for Monthly expenses: tap to fill the Expense name
const MONTHLY_QUICK_PICKS = ['Shop Rent', 'Salary', 'Electricity Bill', 'Internet Bill'];

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const formatRs = (amount: number) => `Rs. ${Math.round(amount).toLocaleString()}`;

const ExpensesPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which expense is being deleted
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Type filter: Daily (counter) / Monthly (rent, salary... admin only); cashiers only ever get Daily
  const [view, setView] = useState<ExpenseKind>('all');
  const [month, setMonth] = useState(currentMonth());
  const [cards, setCards] = useState<ExpenseCards | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages
  const totalPages = totalPagesFromApi;

  // Form state
  const [formData, setFormData] = useState({
    expense: '',
    amount: 0,
    date: '',
    branch: '',
    is_monthly: false
  });

  // Branch options: the branch this user is logged into
  const currentBranch = useBranch();
  const branchOptions = currentBranch ? [currentBranch.name] : [];

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      params.append('kind', view);
      if (month) params.append('month', month);

      const response = await fetch(`/api/expenses/?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const expensesList = data.data || [];
        const total = data.total || expensesList.length;
        const totalPages = data.totalPages || Math.ceil(total / pageSize);

        setExpenses(expensesList);
        setTotalItems(total);
        setTotalPagesFromApi(totalPages);
        setCards(data.cards || null);
        // Backend sends cards to admins only: show the admin UI with the table, without waiting on the session call
        if (data.cards) setIsAdmin(true);
      } else {
        showToast('Failed to fetch expenses', 'error');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('Failed to fetch expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, pageSize, searchTerm, view, month]);

  // Type filter / summary card click (admin only)
  const handleViewChange = (kind: ExpenseKind) => {
    setView(kind);
    setCurrentPage(1);
  };

  // Only admins can add Monthly expenses (hidden from cashiers)
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.user?.role === 'admin');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      expense: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      branch: '',
      is_monthly: view === 'monthly'
    });
    setEditingExpense(null);
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      // Get current user from session (you may need to adjust this based on your auth implementation)
      const currentUser = await getCurrentUser();

      const payload = {
        expense: formData.expense,
        amount: formData.amount,
        expense_date: formData.date || new Date().toISOString().split('T')[0],
        branch: formData.branch,
        created_by: currentUser?.id,
        is_monthly: isAdmin ? formData.is_monthly : false
      };

      if (editingExpense) {
        // Update expense
        const response = await fetch(
          `/api/expenses/${editingExpense.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        Swal.fire({
          title: 'Updated!',
          text: 'Expense has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // Create expense
        const response = await fetch('/api/expenses/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        Swal.fire({
          title: 'Created!',
          text: 'Expense has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }

      await fetchExpenses();
      resetForm();
      setSubmitting(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save expense', 'error');
      setSubmitting(false);
    }
  };

  // Get current user (placeholder - adjust based on your auth implementation)
  const getCurrentUser = async () => {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  // Edit expense
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expense: expense.expense,
      amount: expense.amount,
      date: expense.expense_date,
      branch: expense.branch,
      is_monthly: expense.is_monthly
    });
    setShowAddForm(true);

    // Auto-scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete expense
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setDeletingId(id);
      try {
        const response = await fetch(
          `/api/expenses/${id}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete expense');
        }

        setExpenses(expenses.filter(e => e.id !== id));

        Swal.fire({
          title: 'Deleted!',
          text: 'Expense has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Failed to delete expense', 'error');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Selected month for the summary cards, e.g. "Oct 2026"
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="View Expense" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Left side - Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (!showAddForm) {
                setFormData({
                  expense: '',
                  amount: 0,
                  date: new Date().toISOString().split('T')[0],
                  branch: '',
                  is_monthly: view === 'monthly'
                });
                setEditingExpense(null);
                setShowAddForm(true);
              } else {
                setShowAddForm(false);
              }
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : 'Add New'}
          </button>

          {/* Filters (admin only): Type + Month */}
          {isAdmin && (
            <>
              <select
                value={view}
                onChange={(e) => handleViewChange(e.target.value as ExpenseKind)}
                className="regal-input w-auto py-2"
                aria-label="Type"
              >
                <option value="all">All Types</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value || currentMonth());
                  setCurrentPage(1);
                }}
                className="regal-input w-auto py-2"
                aria-label="Month"
              />
            </>
          )}
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="searchInput"
              type="text"
              placeholder="Search expenses..."
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

      {/* Summary cards (admin only): click a card to show only that type */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { kind: 'daily' as ExpenseKind, label: 'Today (Daily)', amount: cards?.todayDaily, hint: '' },
            { kind: 'daily' as ExpenseKind, label: `${monthLabel} Daily`, amount: cards?.monthDaily, hint: '' },
            { kind: 'monthly' as ExpenseKind, label: `${monthLabel} Monthly`, amount: cards?.monthMonthly, hint: 'Rent, salary... (not in daily cash)' },
          ].map(card => (
            <button
              key={card.label}
              type="button"
              onClick={() => handleViewChange(card.kind)}
              className={`regal-card p-3 md:p-4 text-left transition-shadow hover:shadow-md ${
                view === card.kind ? 'border-l-4 border-regal-yellow' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                  {/* Card stays visible while loading; only the amount pulses */}
                  {loading || card.amount === undefined ? (
                    <div className="h-7 md:h-8 w-28 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    <p className="text-xl md:text-2xl font-semibold text-gray-900">{formatRs(card.amount)}</p>
                  )}
                  {card.hint && <p className="text-[10px] md:text-xs font-medium text-gray-500">{card.hint}</p>}
                </div>
                <div className="text-3xl md:text-4xl">🧾</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <form onSubmit={handleSubmit}>
            {/* Type (admin only): cashiers always add Daily */}
            {isAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Type *</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { monthly: false, label: 'Daily', hint: 'Paid from counter' },
                    { monthly: true, label: 'Monthly', hint: 'Rent, salary...' },
                  ].map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, is_monthly: option.monthly }))}
                      className={`rounded-md border px-4 py-2 text-left transition-colors ${
                        formData.is_monthly === option.monthly
                          ? 'border-regal-yellow bg-regal-yellow text-regal-black'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-regal-yellow'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-[11px]">{option.hint}</span>
                    </button>
                  ))}
                </div>

                {formData.is_monthly && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Quick:</span>
                    {MONTHLY_QUICK_PICKS.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, expense: name }))}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          formData.expense === name
                            ? 'border-regal-yellow bg-regal-yellow text-regal-black'
                            : 'border-gray-300 text-gray-600 hover:border-regal-yellow'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expense *</label>
                <input
                  type="text"
                  name="expense"
                  value={formData.expense}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter expense"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount || ''}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select Branch *</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`regal-btn bg-regal-yellow text-regal-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {editingExpense ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  editingExpense ? 'Update Expense' : 'Add Expense'
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className={`regal-btn bg-gray-300 text-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
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
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                  {isAdmin && (
                    <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  )}
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense, index) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{((currentPage - 1) * pageSize) + index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.expense}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            expense.is_monthly ? 'bg-regal-yellow text-regal-black' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {expense.is_monthly ? 'Monthly' : 'Daily'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(expense.expense_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.branch}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEdit(expense)}
                        disabled={deletingId === expense.id}
                        className={`mr-3 ${
                          deletingId === expense.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className={`${
                          deletingId === expense.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                      >
                        {deletingId === expense.id ? (
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expenses.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No expenses found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
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
    </div>
  );
};

export default ExpensesPage;
