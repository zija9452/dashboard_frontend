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

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

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
            className="regal-btn bg-regal-yellow text-regal-black"
          >
            {showAddForm ? 'Cancel' : '+ Add Warehouse Customer'}
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="regal-btn bg-regal-yellow text-regal-black"
          >
            Report
          </button>
        </div>

        <div className="w-full sm:w-auto flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="regal-input w-full"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border rounded shadow-sm">
          <h3 className="text-lg font-semibold mb-4">{editingCustomer ? 'Edit' : 'Add'} Warehouse Customer</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="cus_name" value={formData.cus_name} onChange={handleInputChange} placeholder="Name" className="regal-input" required />
            <input name="cus_phone" value={formData.cus_phone} onChange={handleInputChange} placeholder="Phone" className="regal-input" required />
            <input name="cus_cnic" value={formData.cus_cnic} onChange={handleInputChange} placeholder="CNIC" className="regal-input" />
            <input name="cus_address" value={formData.cus_address} onChange={handleInputChange} placeholder="Address" className="regal-input" />
            <select name="branch" value={formData.branch} onChange={handleInputChange} className="regal-input">
              <option value="">Select Branch</option>
              {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={submitting} className="regal-btn bg-regal-yellow text-regal-black">
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={resetForm} className="regal-btn bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-left">Branch</th>
              <th className="p-3 text-left">Balance</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.cus_id} className="border-b hover:bg-gray-50">
                <td className="p-3">{c.cus_name}</td>
                <td className="p-3">{c.cus_phone}</td>
                <td className="p-3">{c.cus_address}</td>
                <td className="p-3">{c.branch || '-'}</td>
                <td className="p-3 font-semibold">{c.cus_balance.toFixed(2)}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => handleEdit(c)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.cus_id)} disabled={deletingId === c.cus_id} className="text-red-600 hover:underline">
                    {deletingId === c.cus_id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPagesFromApi > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPagesFromApi}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            baseUrl=""
          />
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Warehouse Customer Report"
        reportUrl="/api/warehouse-customers/customerviewreport"
      />
    </div>
  );
};

export default WarehouseCustomersPage;
