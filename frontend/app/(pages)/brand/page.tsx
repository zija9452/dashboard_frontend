'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';

interface Brand {
  id: string;
  name: string;
  created_at: string;
}

const BrandPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);

  // Form state
  const [formData, setFormData] = useState({
    name: ''
  });

  // Fetch brands
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/brand/', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter by search term
      const filtered = data.filter((brand: Brand) =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setBrands(filtered);
    } catch (error) {
      console.error('Error fetching brands:', error);
      showToast('Failed to fetch brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: ''
    });
    setEditingBrand(null);
    setShowAddForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBrand) {
        // Update brand
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/brand/${editingBrand.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        Swal.fire({
          title: 'Updated!',
          text: 'Brand has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // Create brand
        const response = await fetch('/api/brand/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        Swal.fire({
          title: 'Created!',
          text: 'Brand has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }

      resetForm();
      fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save brand', 'error');
    }
  };

  // Edit brand
  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name
    });
    setShowAddForm(true);
  };

  // Delete brand
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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/brand/${id}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setBrands(brands.filter(b => b.id !== id));

        Swal.fire({
          title: 'Deleted!',
          text: 'Brand has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting brand:', error);
        showToast('Failed to delete brand', 'error');
      }
    }
  };

  // Pagination
  const totalPages = Math.ceil(brands.length / pageSize);

  return (
    <div className="p-0">
      {/* Heading */}
      <h1 className="text-2xl font-medium text-center mb-6">Brand Management</h1>

      {/* Controls Section */}
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
            {showAddForm ? 'Cancel' : '+ Add Brand'}
          </button>
          
          <button
            onClick={() => router.push('/products')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            ← Back to Products
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="brandSearchInput"
              type="text"
              placeholder="Search brands..."
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
              document.getElementById('brandSearchInput')?.focus();
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingBrand ? 'Edit Brand' : 'Add New Brand'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter brand name"
                  required
                />
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="regal-btn bg-regal-yellow text-regal-black"
              >
                {editingBrand ? 'Update Brand' : 'Add Brand'}
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

      {/* Brands Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{brand.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(brand.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {brands.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No brands found.
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
          totalItems={brands.length}
          pageSize={pageSize}
          baseUrl="/brand"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default BrandPage;
