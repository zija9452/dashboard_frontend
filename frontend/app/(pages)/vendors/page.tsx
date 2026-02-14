'use client';

import React, { useState, useEffect } from 'react';
import { Vendor, vendorsApi } from '@/lib/api/vendors';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { FormField, Form } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'closing_balance' | 'credit_balance'>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    gst_no: '',
    opening_balance: 0,
  });

  const { showToast } = useToast();

  // Calculate totalPages based on totalItems and pageSize
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch vendors from API
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);

        // Fetch vendors from API
        const response = await vendorsApi.getVendors(currentPage, pageSize, searchTerm);
        setVendors(response.data);
        setTotalItems(response.total || response.data.length); // Use response.total if available
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [currentPage, pageSize, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'opening_balance' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingVendor) {
        // Update existing vendor
        await vendorsApi.updateVendor(editingVendor.id, formData);
        showToast('Vendor updated successfully', 'success');
      } else {
        // Create new vendor
        await vendorsApi.createVendor(formData);
        showToast('Vendor created successfully', 'success');
      }

      setIsModalOpen(false);
      setEditingVendor(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        gst_no: '',
        opening_balance: 0,
      });

      // Refresh vendors
      const response = await vendorsApi.getVendors(currentPage, pageSize, searchTerm);
      setVendors(response.data);
      setTotalItems(response.total || response.data.length);
    } catch (error) {
      console.error('Error saving vendor:', error);
      showToast('Failed to save vendor', 'error');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      country: vendor.country || '',
      gst_no: vendor.gst_no || '',
      opening_balance: vendor.opening_balance,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await vendorsApi.deleteVendor(id);
        showToast('Vendor deleted successfully', 'success');

        // Refresh vendors
        const response = await vendorsApi.getVendors(currentPage, pageSize, searchTerm);
        setVendors(response.data);
        setTotalItems(response.total || response.data.length);
      } catch (error) {
        console.error('Error deleting vendor:', error);
        showToast('Failed to delete vendor', 'error');
      }
    }
  };

  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      gst_no: '',
      opening_balance: 0,
    });
    setIsModalOpen(true);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Update URL with new page
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());
    if (searchTerm) params.set('search', searchTerm);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching

    // Update URL with search term
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    params.set('limit', pageSize.toString());
    if (searchTerm) params.set('search', searchTerm);
    else params.delete('search');

    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  if (error) {
    return (
      <div className="regal-card m-6">
        <div className="text-red-600 p-4">Error: {error}</div>
      </div>
    );
  }

  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'phone', title: 'Phone' },
    { key: 'email', title: 'Email' },
    { key: 'city', title: 'City' },
    { key: 'opening_balance', title: 'Opening Balance', render: (value: number) => `₹${value.toFixed(2)}` },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <Button onClick={openCreateModal}>Add Vendor</Button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendors..."
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

      <div className="regal-card">
        <DataTable
          columns={columns}
          data={vendors}
          loading={loading}
          actions={(record) => (
            <>
              <Button variant="outline" size="sm" onClick={() => handleEdit(record)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(record.id)} className="ml-2">
                Delete
              </Button>
            </>
          )}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          baseUrl="/vendors"
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {vendors.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No vendors found.</p>
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

      {/* Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Vendor' : 'Create Vendor'}
      >
        <Form onSubmit={handleSubmit}>
          <FormField
            label="Name"
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <FormField
            label="Phone"
            id="phone"
            name="phone"
            type="text"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />

          <FormField
            label="Email"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
          />

          <FormField
            label="Address"
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleInputChange}
            textarea
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="City"
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleInputChange}
            />

            <FormField
              label="State"
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="ZIP Code"
              id="zip_code"
              name="zip_code"
              type="text"
              value={formData.zip_code}
              onChange={handleInputChange}
            />

            <FormField
              label="Country"
              id="country"
              name="country"
              type="text"
              value={formData.country}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="GST Number"
              id="gst_no"
              name="gst_no"
              type="text"
              value={formData.gst_no}
              onChange={handleInputChange}
            />

            <FormField
              label="Opening Balance"
              id="opening_balance"
              name="opening_balance"
              type="number"
              value={formData.opening_balance}
              onChange={handleInputChange}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingVendor ? 'Update' : 'Create'} Vendor
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default VendorsPage;