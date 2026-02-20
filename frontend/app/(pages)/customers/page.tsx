'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  cus_sal_id_fk: string;
  branch: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

const CustomersPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Prevent duplicate submissions
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
    cus_name: '',
    cus_phone: '',
    cus_cnic: '',
    cus_address: '',
    cus_sal_id_fk: '',
    branch: ''
  });

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Build query params for search - same as products API
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/customers/viewcustomer?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns: { data: [...], page, limit, total, totalPages }
        console.log('API Response:', data);
        console.log('Data array length:', data.data?.length);
        console.log('Total from API:', data.total);
        console.log('TotalPages from API:', data.totalPages);
        
        const customersList = Array.isArray(data.data) ? data.data : [];
        const total = data.total || customersList.length;
        const totalPages = data.totalPages || Math.ceil(total / pageSize);

        console.log('Setting customers:', customersList.length);
        console.log('Setting totalItems:', total);
        console.log('Setting totalPagesFromApi:', totalPages);
        
        setCustomers(customersList);
        setTotalItems(total);
        setTotalPagesFromApi(totalPages);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      showToast(error.message || 'Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch salesmans for dropdown
  const fetchSalesmans = async () => {
    try {
      const response = await fetch('/api/admin/getcustomervendorbybranch', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSalesmans(data.salesmans || []);
      }
    } catch (error) {
      console.error('Error fetching salesmans:', error);
    }
  };

  // Fetch customers on page change or initial load
  useEffect(() => {
    console.log('useEffect triggered - currentPage:', currentPage);
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  // Fetch salesmans on mount
  useEffect(() => {
    fetchSalesmans();
  }, []);

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
      cus_name: '',
      cus_phone: '',
      cus_cnic: '',
      cus_address: '',
      cus_sal_id_fk: '',
      branch: ''
    });
    setEditingCustomer(null);
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (submitting) return;

    setSubmitting(true);

    try {
      if (editingCustomer) {
        // Update existing customer - using customers API
        const response = await fetch(`/api/customers/${editingCustomer.cus_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.cus_name,
            contacts: JSON.stringify({
              phone: formData.cus_phone,
              email: "",
              address: formData.cus_address
            }),
            billing_addr: JSON.stringify({
              street: formData.cus_address,
              city: "",
              country: ""
            }),
            shipping_addr: JSON.stringify({
              street: formData.cus_address,
              city: "",
              country: ""
            }),
            cnic: formData.cus_cnic,
            sal_id_fk: formData.cus_sal_id_fk || null,
            branch: formData.branch || null
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Updated!',
            text: 'Customer has been updated successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update customer');
        }
      } else {
        // Create new customer - using customerinvoice API
        const response = await fetch('/api/customerinvoice/Customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            cus_name: formData.cus_name,
            cus_phone: formData.cus_phone,
            cus_address: formData.cus_address,
            cus_cnic: formData.cus_cnic,
            cus_sal_id_fk: formData.cus_sal_id_fk,
            branch: formData.branch
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: 'Created!',
            text: 'Customer has been created successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create customer');
        }
      }

      await fetchCustomers();
      await resetForm();
      setSubmitting(false);
    } catch (error: any) {
      console.error('Error saving customer:', error);
      showToast(error.message || 'Failed to save customer', 'error');
      setSubmitting(false);
    }
  };

  // Edit customer
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      cus_name: customer.cus_name,
      cus_phone: customer.cus_phone,
      cus_cnic: customer.cus_cnic || '',
      cus_address: customer.cus_address || '',
      cus_sal_id_fk: customer.cus_sal_id_fk || '',
      branch: customer.branch || ''
    });
    setShowAddForm(true);
  };

  // Delete customer
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
        const response = await fetch('/api/customers/' + id, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Customer has been deleted successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          await fetchCustomers();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || 'Failed to delete customer');
        }
      } catch (error: any) {
        console.error('Error deleting customer:', error);
        showToast(error.message || 'Failed to delete customer', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4">
      <PageHeader title="View Customer" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add New and Back button */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Customer'}
          </button>

          <button
            onClick={() => router.push('/customer-payment')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Customer Payment
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Customer Details
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="customerSearchInput"
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
              document.getElementById('customerSearchInput')?.focus();
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
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                <label className="block text-sm font-medium mb-1">CNIC *</label>
                <input
                  type="text"
                  name="cus_cnic"
                  value={formData.cus_cnic}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <input
                  type="text"
                  name="cus_address"
                  value={formData.cus_address}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salesman</label>
                <select
                  name="cus_sal_id_fk"
                  value={formData.cus_sal_id_fk}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Salesman</option>
                  {salesmans.map((salesman) => (
                    <option key={salesman.sal_id} value={salesman.sal_id}>
                      {salesman.sal_name}
                    </option>
                  ))}
                </select>
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
                {submitting ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
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

      {/* Customers Table */}
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
                <tr className='text-xs text-gray-900 uppercase tracking-wider font-semibol'>
                  <th className="px-4 py-5 text-left w-48">Name</th>
                  <th className="px-4 py-5 text-left w-32">Phone</th>
                  <th className="px-4 py-5 text-left w-32">CNIC</th>
                  <th className="px-4 py-5 text-left">Address</th>
                  <th className="px-4 py-5 text-left w-24">Balance</th>
                  <th className="px-4 py-5 text-left w-40">Salesman</th>
                  <th className="px-4 py-5 text-left w-40">Branch</th>
                  <th className="px-4 py-5 text-left w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.cus_id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-4 whitespace-nowrap overflow-hidden text-ellipsis">{customer.cus_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{customer.cus_phone}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{customer.cus_cnic || '-'}</td>
                    <td className="px-4 py-4">{customer.cus_address || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{customer.cus_balance?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-4">
                      {salesmans.find(s => s.sal_id === customer.cus_sal_id_fk)?.sal_name || '-'}
                    </td>
                    <td className="px-4 py-4">{customer.branch || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(customer.cus_id)}
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
            baseUrl="/customers"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Customer Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Customer Details"
        reportUrl="/api/customers/report"
      />
    </div>
  );
};

export default CustomersPage;
