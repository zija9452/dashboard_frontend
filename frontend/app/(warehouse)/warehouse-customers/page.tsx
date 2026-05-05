'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import PageHeader from '@/components/ui/PageHeader';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
  cus_cnic: string;
  cus_address: string;
  cus_balance: number;
  branch: string;
}

const WarehouseCustomersPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [marketBalance, setMarketBalance] = useState<number | null>(null);
  const [loadingMarketBalance, setLoadingMarketBalance] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    cus_name: '',
    cus_phone: '',
    cus_cnic: '',
    cus_address: '',
    branch: ''
  });

  const branchOptions = [
    'European Sports Light House',
    'Warehouse Main'
  ];

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/warehouse-customers/viewcustomer?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.totalPages || 0);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch warehouse customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketBalance = async () => {
    try {
      setLoadingMarketBalance(true);
      const response = await fetch('/api/warehouse-customers/market-balance', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMarketBalance(data.total_market_balance);
      }
    } catch (error) {
      console.error('Error fetching market balance:', error);
    } finally {
      setLoadingMarketBalance(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchMarketBalance();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      cus_name: '',
      cus_phone: '',
      cus_cnic: '',
      cus_address: '',
      branch: ''
    });
    setEditingCustomer(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        name: formData.cus_name,
        contacts: JSON.stringify({
          phone: formData.cus_phone,
          email: "",
          address: formData.cus_address
        }),
        cnic: formData.cus_cnic,
        branch: formData.branch || null
      };

      let response;
      if (editingCustomer) {
        response = await fetch(`/api/warehouse-customers/${editingCustomer.cus_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/warehouse-customers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        Swal.fire({
          title: editingCustomer ? 'Updated!' : 'Created!',
          text: `Warehouse customer has been ${editingCustomer ? 'updated' : 'created'} successfully.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        await fetchCustomers();
        await fetchMarketBalance();
        resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save warehouse customer');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to save warehouse customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      cus_name: customer.cus_name,
      cus_phone: customer.cus_phone,
      cus_cnic: customer.cus_cnic || '',
      cus_address: customer.cus_address || '',
      branch: customer.branch || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/warehouse-customers/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          Swal.fire('Deleted!', 'Warehouse customer has been deleted.', 'success');
          await fetchCustomers();
          await fetchMarketBalance();
        } else {
          throw new Error('Failed to delete warehouse customer');
        }
      } catch (error: any) {
        showToast(error.message || 'Failed to delete warehouse customer', 'error');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Warehouse Customers" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Warehouse Customer'}
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Customer Details
          </button>
        </div>

        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="warehouseCustomerSearchInput"
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              document.getElementById('warehouseCustomerSearchInput')?.focus();
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingCustomer ? 'Edit Warehouse Customer' : 'Add New Warehouse Customer'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="cus_name"
                  value={formData.cus_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="text"
                  name="cus_phone"
                  value={formData.cus_phone}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  name="cus_cnic"
                  value={formData.cus_cnic}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  name="cus_address"
                  value={formData.cus_address}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="regal-btn bg-gray-300 text-black"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <th className="px-4 py-5 text-left w-48">Name</th>
                  <th className="px-4 py-5 text-left w-32">Phone</th>
                  <th className="px-4 py-5 text-left w-32">CNIC</th>
                  <th className="px-4 py-5 text-left w-48">Address</th>
                  <th className="px-4 py-5 text-left w-40">Branch</th>
                  <th className="px-4 py-5 text-left w-24">Balance</th>
                  <th className="px-4 py-5 text-left w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map(c => (
                  <tr key={c.cus_id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-4 overflow-hidden text-ellipsis whitespace-nowrap">{c.cus_name}</td>
                    <td className="px-4 py-4">{c.cus_phone}</td>
                    <td className="px-4 py-4">{c.cus_cnic || '-'}</td>
                    <td className="px-4 py-4 overflow-hidden text-ellipsis whitespace-nowrap">{c.cus_address || '-'}</td>
                    <td className="px-4 py-4">{c.branch || '-'}</td>
                    <td className="px-4 py-4 font-semibold text-gray-900">{c.cus_balance.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          disabled={deletingId === c.cus_id}
                          className={`${
                            deletingId === c.cus_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.cus_id)}
                          disabled={deletingId === c.cus_id}
                          className={`${
                            deletingId === c.cus_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {deletingId === c.cus_id ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination & Market Balance */}
      <div className="mt-8 space-y-6">
        {/* Pagination - Centered */}
        <div className="flex justify-center">
          {totalPagesFromApi > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesFromApi}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              baseUrl=""
            />
          )}
        </div>

        {/* Total Market Balance Display - Left Aligned */}
        <div className="flex justify-start">
          <div className="px-6 py-3 bg-gray-100 border border-gray-300 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-700">Total Market Balance: </span>
            <span className="text-base font-bold text-red-700">
              {loadingMarketBalance ? (
                <span className="animate-pulse text-sm">Calculating Market Balance...</span>
              ) : (
                `Rs. ${marketBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
              )}
            </span>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Warehouse Customer Details"
        reportUrl="/api/warehouse-customers/customerviewreport"
      />
    </div>
  );
};

export default WarehouseCustomersPage;
