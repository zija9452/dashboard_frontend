'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

interface Demand {
  id: string;
  demand_text: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  created_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface NewCustomerType {
  cus_name: string;
  cus_phone: string;
  cus_cnic: string;
  cus_address: string;
  cus_sal_id_fk: string;
  branch: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-lime-200 text-lime-800',
  FULFILLED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const rowColors: Record<string, string> = {
  PENDING: 'bg-lime-100 hover:bg-lime-100',
  FULFILLED: 'bg-blue-50 hover:bg-blue-100',
  CANCELLED: 'bg-red-50 hover:bg-red-100',
};

const DemandPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [userRole, setUserRole] = useState<string | null>(null);

  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);

  // Add Demand form
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    demand_text: '',
    category: '',
    customer_id: '',
  });

  // Right-side details/edit panel
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    demand_text: '',
    category: '',
    customer_id: '',
    status: 'PENDING' as Demand['status'],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add Customer modal (shared between Add Demand form and edit panel, same logic as Customer Invoice)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustomerTarget, setAddCustomerTarget] = useState<'add' | 'edit' | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerType>({
    cus_name: '',
    cus_phone: '',
    cus_cnic: '',
    cus_address: '',
    cus_sal_id_fk: '',
    branch: 'European Sports Light House',
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Add Category modal (shared between Add Demand form and edit panel, same pattern as Add Customer)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryTarget, setAddCategoryTarget] = useState<'add' | 'edit' | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchRole();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/demand-category/?page=1&limit=1000', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCategories(data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching demand categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSalesmans = async () => {
    try {
      const response = await fetch('/api/admin/getcustomervendorbybranch', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSalesmans(data.salesmans || []);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchSalesmans();
  }, []);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('search_string', searchTerm);
      if (statusFilter) params.append('demand_status', statusFilter);

      const response = await fetch(`/api/demand/list?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDemands(data.data || []);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.total_pages || 0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch demands', 'error');
      }
    } catch (error) {
      console.error('Error fetching demands:', error);
      showToast('Error fetching demands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const resetAddForm = () => {
    setFormData({ demand_text: '', category: '', customer_id: '' });
    setShowAddForm(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.demand_text.trim()) {
      showToast('Please enter what the customer demanded', 'error');
      return;
    }

    if (!formData.category) {
      showToast('Please select a category', 'error');
      return;
    }

    const pickedCustomer = customers.find((c) => c.cus_id === formData.customer_id);

    setSubmitting(true);
    try {
      const response = await fetch('/api/demand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          demand_text: formData.demand_text.trim(),
          category: formData.category,
          customer_name: pickedCustomer?.cus_name || null,
          customer_phone: pickedCustomer?.cus_phone || null,
        }),
      });

      if (response.ok) {
        showToast('Demand recorded successfully', 'success');
        resetAddForm();
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          fetchDemands();
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to record demand', 'error');
      }
    } catch (error) {
      console.error('Error creating demand:', error);
      showToast('Error recording demand', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDemandDetails = (demand: Demand) => {
    setSelectedDemand(demand);
    setEditDraft({
      demand_text: demand.demand_text,
      category: demand.category || '',
      // No customer_id snapshot is stored on the demand record itself (only a name/phone
      // snapshot), so the picker starts unselected; the recorded name/phone is kept as-is
      // on save unless a new customer is explicitly picked here.
      customer_id: '',
      status: demand.status,
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    // Fully unmount the overlay after the slide-out transition finishes,
    // otherwise the fullscreen wrapper stays mounted (invisible) and blocks
    // clicks on the rest of the page until a refresh.
    setTimeout(() => setSelectedDemand(null), 300);
  };

  const handleSaveEdit = async () => {
    if (!selectedDemand) return;
    if (!editDraft.demand_text.trim()) {
      showToast('Demand text cannot be empty', 'error');
      return;
    }

    if (!editDraft.category) {
      showToast('Please select a category', 'error');
      return;
    }

    const pickedCustomer = customers.find((c) => c.cus_id === editDraft.customer_id);

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/demand/update/${selectedDemand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          demand_text: editDraft.demand_text.trim(),
          category: editDraft.category,
          // Only overwrite the recorded customer if a new one was actually picked;
          // otherwise keep whatever was already saved on this demand.
          customer_name: pickedCustomer ? pickedCustomer.cus_name : selectedDemand.customer_name || null,
          customer_phone: pickedCustomer ? pickedCustomer.cus_phone : selectedDemand.customer_phone || null,
          status: editDraft.status,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedDemand({
          ...selectedDemand,
          demand_text: result.demand_text,
          category: result.category,
          customer_name: result.customer_name,
          customer_phone: result.customer_phone,
          status: result.status,
          fulfilled_at: result.fulfilled_at,
          cancelled_at: result.cancelled_at,
        });
        showToast('Demand updated successfully', 'success');
        fetchDemands();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update demand', 'error');
      }
    } catch (error) {
      console.error('Error updating demand:', error);
      showToast('Error updating demand', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDemand) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This demand record will be permanently deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/demand/${selectedDemand.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('Demand deleted successfully', 'success');
        closePanel();
        fetchDemands();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete demand', 'error');
      }
    } catch (error) {
      console.error('Error deleting demand:', error);
      showToast('Error deleting demand', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const validateNewCustomerForm = (customer: NewCustomerType) => {
    const requiredFields: { key: keyof NewCustomerType; label: string }[] = [
      { key: 'cus_name', label: 'Customer Name' },
      { key: 'cus_phone', label: 'Phone' },
      { key: 'cus_cnic', label: 'CNIC' },
      { key: 'cus_address', label: 'Address' },
      { key: 'cus_sal_id_fk', label: 'Salesman' },
    ];
    return requiredFields.filter((field) => !customer[field.key]?.trim());
  };

  const resetNewCustomerForm = () => {
    setNewCustomer({
      cus_name: '',
      cus_phone: '',
      cus_cnic: '',
      cus_address: '',
      cus_sal_id_fk: '',
      branch: 'European Sports Light House',
    });
  };

  const handleAddCustomer = async () => {
    const missingFields = validateNewCustomerForm(newCustomer);
    if (missingFields.length > 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setAddingCustomer(true);
    try {
      const response = await fetch('/api/customerinvoice/Customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const addedCustomer = await response.json();
        await fetchCustomers();
        const newCustomerId = addedCustomer.cus_id || addedCustomer.id;

        if (addCustomerTarget === 'edit') {
          setEditDraft((prev) => ({ ...prev, customer_id: newCustomerId }));
        } else {
          setFormData((prev) => ({ ...prev, customer_id: newCustomerId }));
        }

        setShowAddCustomerModal(false);
        setAddCustomerTarget(null);
        resetNewCustomerForm();
        showToast('Customer added successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add customer', 'error');
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showToast('Please enter a category name', 'error');
      return;
    }

    setAddingCategory(true);
    try {
      const response = await fetch('/api/demand-category/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const addedCategory = await response.json();
        await fetchCategories();

        if (addCategoryTarget === 'edit') {
          setEditDraft((prev) => ({ ...prev, category: addedCategory.name }));
        } else {
          setFormData((prev) => ({ ...prev, category: addedCategory.name }));
        }

        setShowAddCategoryModal(false);
        setAddCategoryTarget(null);
        setNewCategoryName('');
        showToast('Category added successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to add category', 'error');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      showToast('Failed to add category', 'error');
    } finally {
      setAddingCategory(false);
    }
  };

  const isDirty = selectedDemand
    ? editDraft.demand_text !== selectedDemand.demand_text ||
      editDraft.category !== (selectedDemand.category || '') ||
      editDraft.customer_id !== '' ||
      editDraft.status !== selectedDemand.status
    : false;

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Demand" />

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
              }}
              className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
            >
              {showAddForm ? 'Cancel' : '+ Add Demand'}
            </button>
            <button
              onClick={() => router.push('/demand-category')}
              className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
            >
              Demand Category
            </button>
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
                  placeholder="Search by demand, customer, category..."
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
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="regal-input w-36"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Add Demand Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">Add New Demand</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Demand *</label>
                <input
                  type="text"
                  value={formData.demand_text}
                  onChange={(e) => setFormData({ ...formData, demand_text: e.target.value })}
                  className="regal-input w-full"
                  placeholder="What did the customer ask for?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCategoryTarget('add');
                      setShowAddCategoryModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-5"
                    title="Add New Category"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="regal-input w-full"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.cus_id} value={customer.cus_id}>
                        {customer.cus_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCustomerTarget('add');
                      setShowAddCustomerModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-5"
                    title="Add New Customer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Add Demand'}
              </button>
              <button
                type="button"
                onClick={resetAddForm}
                className="regal-btn bg-gray-300 text-black"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <th className="px-3 py-5 text-left w-64">Demand</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-left w-40">Customer</th>
                  <th className="px-3 py-5 text-left w-28">Status</th>
                  <th className="px-3 py-5 text-left w-32">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demands.map((demand, index) => (
                  <tr
                    key={demand.id}
                    onClick={() => openDemandDetails(demand)}
                    className={`text-sm text-gray-900 transition-colors cursor-pointer ${
                      rowColors[demand.status] || 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4 font-medium truncate">{demand.demand_text}</td>
                    <td className="px-3 py-4">{demand.category || 'N/A'}</td>
                    <td className="px-3 py-4">{demand.customer_name || '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[demand.status]}`}>
                        {demand.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">{formatDate(demand.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {demands.length === 0 && (
              <p className="text-center py-12 text-gray-500">No demands found</p>
            )}
          </div>

          {totalPagesFromApi > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesFromApi}
                totalItems={totalItems}
                pageSize={pageSize}
                baseUrl="/demand"
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Right-side demand details/edit panel */}
      {selectedDemand && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${
            isPanelOpen ? '' : 'pointer-events-none'
          }`}
        >
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              isPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closePanel}
          ></div>

          <div
            className={`relative w-full sm:w-2/5 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Demand Details</h2>
              <button
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Demand</label>
                <input
                  type="text"
                  value={editDraft.demand_text}
                  onChange={(e) => setEditDraft({ ...editDraft, demand_text: e.target.value })}
                  className="regal-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Category *</label>
                <div className="flex gap-2">
                  <select
                    value={editDraft.category}
                    onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCategoryTarget('edit');
                      setShowAddCategoryModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-4"
                    title="Add New Category"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Customer <span className="text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={editDraft.customer_id}
                    onChange={(e) => setEditDraft({ ...editDraft, customer_id: e.target.value })}
                    className="regal-input w-full"
                  >
                    <option value="">
                      {selectedDemand.customer_name
                        ? `Keep recorded: ${selectedDemand.customer_name}`
                        : 'No customer selected'}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.cus_id} value={customer.cus_id}>
                        {customer.cus_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCustomerTarget('edit');
                      setShowAddCustomerModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-4"
                    title="Add New Customer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3 pt-2">
                <span className="text-sm text-gray-500">Recorded Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedDemand.created_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Fulfilled Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedDemand.fulfilled_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Cancelled Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedDemand.cancelled_at)}</span>
              </div>

              <div className="pt-2">
                <label className="block text-sm text-gray-500 mb-2">Status</label>
                <select
                  value={editDraft.status}
                  onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as Demand['status'] })}
                  className="regal-input w-full"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !isDirty}
                  className={`regal-btn px-4 py-2 ${
                    savingEdit || !isDirty
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-regal-yellow text-regal-black'
                  }`}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={`regal-btn px-4 py-2 ${
                      deleting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white'
                    }`}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal - same logic as Customer Invoice's Add Customer flow */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Customer</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCustomer(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_name: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={newCustomer.cus_phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_phone: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  value={newCustomer.cus_cnic}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_cnic: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={newCustomer.cus_address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_address: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter address"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salesman</label>
                <select
                  value={newCustomer.cus_sal_id_fk}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_sal_id_fk: e.target.value })}
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
                  value={newCustomer.branch}
                  onChange={(e) => setNewCustomer({ ...newCustomer, branch: e.target.value })}
                  className="regal-input w-full"
                >
                  <option value="European Sports Light House">European Sports Light House</option>
                </select>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setAddCustomerTarget(null);
                    resetNewCustomerForm();
                  }}
                  disabled={addingCustomer}
                  className="regal-btn bg-gray-300 text-black flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal - lets a category be added on the spot from the demand form/edit panel */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Category</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="regal-input w-full"
                  placeholder="Enter category name"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={addingCategory}
                  className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addingCategory ? 'Adding...' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setAddCategoryTarget(null);
                    setNewCategoryName('');
                  }}
                  disabled={addingCategory}
                  className="regal-btn bg-gray-300 text-black flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandPage;
