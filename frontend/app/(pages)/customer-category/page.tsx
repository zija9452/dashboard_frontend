'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';

interface SubCategory {
  sub_category: string;
  options: string[];
}

interface CustomerCategory {
  id: string;
  main_category: string;
  sub_categories: SubCategory[];
  branch: string;
  created_at: string;
}

const CustomerCategoryPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which category is being deleted
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const totalPages = totalPagesFromApi;

  // Form state
  const [mainCategoryName, setMainCategoryName] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([
    { sub_category: '', options: [''] }
  ]);

  // Fetch customer categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/customer-category/?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const categoriesList = data.data || [];
      const total = data.total || categoriesList.length;
      const totalPages = data.totalPages || Math.ceil(total / pageSize);

      setCategories(categoriesList);
      setTotalItems(total);
      setTotalPagesFromApi(totalPages);
    } catch (error) {
      console.error('Error fetching customer categories:', error);
      showToast('Failed to fetch customer categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentPage, pageSize, searchTerm]);

  // Reset form
  const resetForm = () => {
    setMainCategoryName('');
    setSubCategories([{ sub_category: '', options: [''] }]);
    setEditingCategory(null);
    setShowAddForm(false);
  };

  // Add new sub-category
  const handleAddSubCategory = () => {
    setSubCategories([...subCategories, { sub_category: '', options: [''] }]);
  };

  // Remove sub-category
  const handleRemoveSubCategory = (index: number) => {
    if (subCategories.length > 1) {
      const updated = subCategories.filter((_, i) => i !== index);
      setSubCategories(updated);
    }
  };

  // Update sub-category name
  const handleUpdateSubCategory = (index: number, value: string) => {
    const updated = [...subCategories];
    updated[index].sub_category = value;
    setSubCategories(updated);
  };

  // Add new option to a sub-category
  const handleAddOption = (subCatIndex: number) => {
    const updated = [...subCategories];
    updated[subCatIndex].options = [...updated[subCatIndex].options, ''];
    setSubCategories(updated);
  };

  // Remove option from a sub-category
  const handleRemoveOption = (subCatIndex: number, optionIndex: number) => {
    const updated = [...subCategories];
    if (updated[subCatIndex].options.length > 1) {
      updated[subCatIndex].options = updated[subCatIndex].options.filter((_, i) => i !== optionIndex);
      setSubCategories(updated);
    }
  };

  // Update option value
  const handleUpdateOption = (subCatIndex: number, optionIndex: number, value: string) => {
    const updated = [...subCategories];
    updated[subCatIndex].options[optionIndex] = value;
    setSubCategories(updated);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    // Validation
    if (!mainCategoryName.trim()) {
      showToast('Please enter main category name', 'error');
      return;
    }

    // Validate sub-categories and options
    for (let i = 0; i < subCategories.length; i++) {
      if (!subCategories[i].sub_category.trim()) {
        showToast(`Please enter sub-category ${i + 1} name`, 'error');
        return;
      }
      for (let j = 0; j < subCategories[i].options.length; j++) {
        if (!subCategories[i].options[j].trim()) {
          showToast(`Please enter option ${j + 1} for "${subCategories[i].sub_category}"`, 'error');
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (editingCategory) {
        // UPDATE existing category
        const response = await fetch(`/api/customer-category/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sub_categories: subCategories
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to update category');
        }

        Swal.fire({
          title: 'Updated!',
          text: 'Category has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // CREATE new category
        const response = await fetch('/api/customer-category/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            main_category: mainCategoryName.trim(),
            sub_categories: subCategories,
            branch: 'European Sports Light House'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create category');
        }

        Swal.fire({
          title: 'Created!',
          text: 'Category has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }

      await fetchCategories();
      resetForm();
      setSubmitting(false);
    } catch (error) {
      console.error('Error saving customer category:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save category', 'error');
      setSubmitting(false);
    }
  };

  // Edit category - load existing data
  const handleEdit = (category: CustomerCategory) => {
    setEditingCategory(category);
    setMainCategoryName(category.main_category);
    // Convert API data to form structure
    setSubCategories(category.sub_categories.map(sc => ({
      sub_category: sc.sub_category,
      options: sc.options.length > 0 ? sc.options : ['']
    })));
    setShowAddForm(true);
  };

  // Delete category
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
        const response = await fetch(`/api/customer-category/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setCategories(categories.filter(c => c.id !== id));

        Swal.fire({
          title: 'Deleted!',
          text: 'Customer category has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting customer category:', error);
        showToast('Failed to delete customer category', 'error');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Customer Category Management" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Customer Category'}
          </button>

          <button
            onClick={() => router.push('/ideal-pricing')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            ⚡ Ideal Pricing
          </button>
        </div>

        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="categorySearchInput"
              type="text"
              placeholder="Search by main category..."
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
              document.getElementById('categorySearchInput')?.focus();
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
            {editingCategory ? 'Edit Customer Category' : 'Add New Customer Category'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create a category with multiple sub-categories and options (e.g., T-Shirt with Neck, Fabric, etc.)
          </p>
          
          <form onSubmit={handleSubmit}>
            {/* Main Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Main Category Name *</label>
              <input
                type="text"
                value={mainCategoryName}
                onChange={(e) => setMainCategoryName(e.target.value)}
                className="regal-input w-full"
                placeholder="e.g., T-Shirt, Football Jersey, Track Suit..."
                required
                disabled={!!editingCategory}
              />
              {editingCategory && (
                <p className="text-xs text-gray-500 mt-1">Main category name cannot be changed</p>
              )}
            </div>

            {/* Sub-Categories */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Sub-Categories & Options *</label>
                <button
                  type="button"
                  onClick={handleAddSubCategory}
                  className="text-sm bg-regal-yellow text-regal-black px-3 py-1 rounded flex items-center gap-1 hover:bg-yellow-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Sub-Category
                </button>
              </div>

              <div className="space-y-4">
                {subCategories.map((subCat, subCatIndex) => (
                  <div key={subCatIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    {/* Sub-Category Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">Sub-Category {subCatIndex + 1}:</span>
                      <input
                        type="text"
                        value={subCat.sub_category}
                        onChange={(e) => handleUpdateSubCategory(subCatIndex, e.target.value)}
                        className="regal-input flex-1"
                        placeholder="e.g., Neck, Fabric, Size, Color..."
                        required
                      />
                      {subCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategory(subCatIndex)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove sub-category"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Options */}
                    <div className="ml-4 space-y-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Options:</label>
                      {subCat.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-16">Option {optionIndex + 1}:</span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleUpdateOption(subCatIndex, optionIndex, e.target.value)}
                            className="regal-input flex-1"
                            placeholder="e.g., Round, V-Neck, Polyzone..."
                            required
                          />
                          {subCat.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(subCatIndex, optionIndex)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remove option"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {/* Add Option Button */}
                      <button
                        type="button"
                        onClick={() => handleAddOption(subCatIndex)}
                        className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-1 mt-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Another Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Save Category')}
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

      {/* Categories Table */}
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
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Main Category</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Sub-Categories</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.main_category}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="space-y-1">
                        {category.sub_categories.map((sc, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-semibold text-gray-900">{sc.sub_category}:</span>
                            <span className="text-gray-600 ml-1">{sc.options.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{category.branch}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm flex">
                      <button
                        onClick={() => handleEdit(category)}
                        disabled={deletingId === category.id}
                        className={`mr-3 ${
                          deletingId === category.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        className={`${
                          deletingId === category.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                      >
                        {deletingId === category.id ? (
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

            {categories.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No customer categories found. Click "+ Add Customer Category" to create one.
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
          baseUrl="/customer-category"
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default CustomerCategoryPage;
