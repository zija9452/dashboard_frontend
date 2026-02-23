'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import PageHeader from '@/components/ui/PageHeader';

interface Salesman {
  sal_id: string;
  sal_name: string;
  sal_phone: string;
  sal_address: string;
  branch: string;
}

const SalesmanPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages - limit to max 5 pages
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Form state
  const [formData, setFormData] = useState({
    sal_name: '',
    sal_phone: '',
    sal_address: '',
    branch: ''
  });

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Fetch salesmen
  const fetchSalesmen = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/salesman/viewsalesman?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const salesmenList = data.data || [];
        const total = data.total || salesmenList.length;
        const totalPages = data.totalPages || Math.ceil(total / pageSize);

        setSalesmen(salesmenList);
        setTotalItems(total);
        setTotalPagesFromApi(totalPages);
      }
    } catch (error: any) {
      console.error('Error fetching salesmen:', error);
      showToast(error.message || 'Failed to fetch salesmen', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch salesmen on page change or search term change
  useEffect(() => {
    fetchSalesmen();
  }, [currentPage, pageSize, searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      sal_name: '',
      sal_phone: '',
      sal_address: '',
      branch: ''
    });
    setEditingSalesman(null);
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    setSubmitting(true);

    try {
      if (editingSalesman) {
        // Update existing salesman
        const response = await fetch(`/api/salesman/${editingSalesman.sal_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.sal_name,
            phone: formData.sal_phone,
            address: formData.sal_address,
            branch: formData.branch
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Updated!',
            text: 'Salesman has been updated successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to update salesman');
        }
      } else {
        // Create new salesman
        const response = await fetch('/api/salesman/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.sal_name,
            phone: formData.sal_phone,
            address: formData.sal_address,
            branch: formData.branch
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Created!',
            text: 'Salesman has been created successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create salesman');
        }
      }

      await fetchSalesmen();
      await resetForm();
      setSubmitting(false);
    } catch (error: any) {
      console.error('Error saving salesman:', error);
      showToast(error.message || 'Failed to save salesman', 'error');
      setSubmitting(false);
    }
  };

  // Edit salesman
  const handleEdit = (salesman: Salesman) => {
    setEditingSalesman(salesman);
    setFormData({
      sal_name: salesman.sal_name,
      sal_phone: salesman.sal_phone || '',
      sal_address: salesman.sal_address || '',
      branch: salesman.branch || ''
    });
    setShowAddForm(true);
  };

  // Delete salesman
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
      try {
        const response = await fetch(`/api/salesman/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Salesman has been deleted successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          await fetchSalesmen();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to delete salesman');
        }
      } catch (error: any) {
        console.error('Error deleting salesman:', error);
        showToast(error.message || 'Failed to delete salesman', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <PageHeader title="View Salesman" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add New and Report buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Salesman'}
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Salesman Details
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="salesmanSearchInput"
              type="text"
              placeholder="Search salesmen..."
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
              document.getElementById('salesmanSearchInput')?.focus();
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingSalesman ? 'Edit Salesman' : 'Add New Salesman'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="sal_name"
                  value={formData.sal_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter salesman name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="text"
                  name="sal_phone"
                  value={formData.sal_phone}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <input
                  type="text"
                  name="sal_address"
                  value={formData.sal_address}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter address"
                  required
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
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingSalesman ? 'Update Salesman' : 'Add Salesman')}
              </button>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="regal-btn bg-gray-300 text-black"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Salesmen Table */}
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
                  <th className="px-4 py-5 text-left w-40">Name</th>
                  <th className="px-4 py-5 text-left w-32">Phone</th>
                  <th className="px-4 py-5 text-left w-40">Address</th>
                  <th className="px-4 py-5 text-left w-40">Branch</th>
                  <th className="px-4 py-5 text-left w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesmen.map((salesman) => (
                  <tr key={salesman.sal_id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-4">{salesman.sal_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{salesman.sal_phone}</td>
                    <td className="px-4 py-4">{salesman.sal_address || '-'}</td>
                    <td className="px-4 py-4">{salesman.branch || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(salesman)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(salesman.sal_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/salesman"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Salesman Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Salesman Details"
        reportUrl="/api/salesman/report"
      />
    </div>
  );
};

export default SalesmanPage;
