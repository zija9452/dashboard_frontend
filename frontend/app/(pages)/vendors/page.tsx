'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import PageHeader from '@/components/ui/PageHeader';

interface Vendor {
  ven_id: string;
  ven_name: string;
  ven_phone: string;
  ven_address: string;
  branch: string;
  vend_balance?: number;
}

const VendorsPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages - limit to max 5 pages
  const totalPages = Math.min(totalPagesFromApi, 5);

  // Form state
  const [formData, setFormData] = useState({
    ven_name: '',
    ven_phone: '',
    ven_address: '',
    branch: ''
  });

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoading(true);

      // Build query params for search
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/admin/viewvendor?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch vendors');
      }

      const data = await response.json();
      console.log('API Response:', data);

      const vendorsList = data.data || [];
      const total = data.total || vendorsList.length;
      const totalPages = data.totalPages || Math.ceil(total / pageSize);

      setVendors(vendorsList);
      setTotalItems(total);
      setTotalPagesFromApi(totalPages);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      showToast(error.message || 'Failed to fetch vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendors on page change or search term change
  useEffect(() => {
    fetchVendors();
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
      ven_name: '',
      ven_phone: '',
      ven_address: '',
      branch: ''
    });
    setEditingVendor(null);
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (submitting) return;

    setSubmitting(true);

    try {
      // Prepare contacts JSON
      const contactsData = {
        phone: formData.ven_phone,
        email: '',
        address: formData.ven_address
      };

      if (editingVendor) {
        // Update existing vendor using PUT /vendors/{id}
        const response = await fetch(`/api/vendors/${editingVendor.ven_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.ven_name,
            contacts: JSON.stringify(contactsData),
            branch: formData.branch || null
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Updated!',
            text: 'Vendor has been updated successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.error?.message || 'Failed to update vendor');
        }
      } else {
        // Create new vendor using POST /vendors/
        const response = await fetch('/api/vendors/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.ven_name,
            contacts: JSON.stringify(contactsData),
            branch: formData.branch
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Created!',
            text: 'Vendor has been created successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.error?.message || 'Failed to create vendor');
        }
      }

      await fetchVendors();
      await resetForm();
      setSubmitting(false);
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      showToast(error.message || 'Failed to save vendor', 'error');
      setSubmitting(false);
    }
  };

  // Edit vendor
  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      ven_name: vendor.ven_name,
      ven_phone: vendor.ven_phone,
      ven_address: vendor.ven_address || '',
      branch: vendor.branch || ''
    });
    setShowAddForm(true);
  };

  // Delete vendor
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
        const response = await fetch(`/api/admin/deletevendor/${id}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete vendor');
        }

        Swal.fire({
          title: 'Deleted!',
          text: 'Vendor has been deleted successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        await fetchVendors();
      } catch (error: any) {
        console.error('Error deleting vendor:', error);
        showToast(error.message || 'Failed to delete vendor', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fetch vendor report
  const fetchVendorReport = async () => {
    try {
      setReportLoading(true);
      const response = await fetch('/api/vendors/vendorviewreport', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setShowReportModal(true);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch report', 'error');
      }
    } catch (error: any) {
      console.error('Error fetching report:', error);
      showToast(error.message || 'Failed to fetch report', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="p-4">
      <PageHeader title="View Vendor" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add New, Vendor Payment, Vendor Details buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Vendor'}
          </button>

          <button
            onClick={() => router.push('/vendor-payment')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Vendor Payment
          </button>

          <button
            onClick={fetchVendorReport}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Vendor Details
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="vendorSearchInput"
              type="text"
              placeholder="Search vendors..."
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
              document.getElementById('vendorSearchInput')?.focus();
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
            {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="ven_name"
                  value={formData.ven_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter vendor name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="text"
                  name="ven_phone"
                  value={formData.ven_phone}
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
                  name="ven_address"
                  value={formData.ven_address}
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
                {submitting ? 'Saving...' : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
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

      {/* Vendors Table */}
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
                  <th className="px-4 py-5 text-left w-40">Address</th>
                  <th className="px-4 py-5 text-left w-24">Balance</th>
                  <th className="px-4 py-5 text-left w-40">Branch</th>
                  <th className="px-4 py-5 text-left w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.ven_id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-4">{vendor.ven_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{vendor.ven_phone}</td>
                    <td className="px-4 py-4">{vendor.ven_address || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{vendor.vend_balance?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-4">{vendor.branch || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.ven_id)}
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
            baseUrl="/vendors"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Vendor Report Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowReportModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Vendor Details</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {reportLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-regal-yellow mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading report...</p>
              </div>
            ) : reportData ? (
              <div>
                <iframe
                  src={`data:application/pdf;base64,${reportData}`}
                  className="w-full h-[70vh] border rounded"
                  title="Vendor Details"
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No report available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPage;
