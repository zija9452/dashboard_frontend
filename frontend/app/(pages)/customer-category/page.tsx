'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import { useBranch } from '@/lib/branch';
import { PencilSquareIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface SubCategory {
  sub_category: string;
  options: string[];
  is_modifier?: boolean;
  is_optional?: boolean;
  dye_options?: string[]; // options ticked "Dye" - no MOQ charges, dye rate instead (Ideal Pricing page)
}

interface CustomerCategory {
  id: string;
  main_category: string;
  sub_categories: SubCategory[];
  branch: string;
  dtf_enabled?: boolean; // DTF logos box in Quotation / Customer Invoice (Hoodie, Jacket)
  created_at: string;
}

const CustomerCategoryPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const currentBranch = useBranch(); // Branch this user is logged into

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
    { sub_category: '', options: [''], is_modifier: false, is_optional: false }
  ]);
  const [dtfEnabled, setDtfEnabled] = useState(false);

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
    setSubCategories([{ sub_category: '', options: [''], is_modifier: false, is_optional: false }]);
    setDtfEnabled(false);
    setEditingCategory(null);
    setShowAddForm(false);
  };

  // Add new sub-category
  const handleAddSubCategory = () => {
    setSubCategories([...subCategories, { sub_category: '', options: [''], is_modifier: false, is_optional: false }]);
  };

  // Toggle the Price Modifier / Optional checkboxes for a sub-category
  const handleToggleSubCategoryFlag = (index: number, flag: 'is_modifier' | 'is_optional') => {
    const updated = [...subCategories];
    updated[index][flag] = !updated[index][flag];
    setSubCategories(updated);
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
      const removed = updated[subCatIndex].options[optionIndex];
      updated[subCatIndex].options = updated[subCatIndex].options.filter((_, i) => i !== optionIndex);
      updated[subCatIndex].dye_options = (updated[subCatIndex].dye_options || []).filter(o => o !== removed);
      setSubCategories(updated);
    }
  };

  // Update option value (a ticked Dye option keeps its tick when renamed)
  const handleUpdateOption = (subCatIndex: number, optionIndex: number, value: string) => {
    const updated = [...subCategories];
    const old = updated[subCatIndex].options[optionIndex];
    updated[subCatIndex].options[optionIndex] = value;
    updated[subCatIndex].dye_options = (updated[subCatIndex].dye_options || []).map(o => (o === old ? value : o));
    setSubCategories(updated);
  };

  // Tick / untick an option as Dye
  const handleToggleDyeOption = (subCatIndex: number, option: string) => {
    const updated = [...subCategories];
    const dye = updated[subCatIndex].dye_options || [];
    updated[subCatIndex].dye_options = dye.includes(option) ? dye.filter(o => o !== option) : [...dye, option];
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
            sub_categories: subCategories,
            dtf_enabled: dtfEnabled
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
            dtf_enabled: dtfEnabled,
            branch: currentBranch?.name // omitted until loaded -> backend uses the session's branch
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
      options: sc.options.length > 0 ? sc.options : [''],
      is_modifier: sc.is_modifier || false,
      is_optional: sc.is_optional || false,
      dye_options: sc.dye_options || []
    })));
    setDtfEnabled(!!category.dtf_enabled);
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

            {/* DTF logos - adds the optional DTF box (width x height per logo) in Quotation / Customer Invoice */}
            <label htmlFor="category-dtf-enabled" className="mb-6 flex items-start gap-2.5 cursor-pointer rounded-lg border border-teal-200 bg-teal-50 p-3">
              <input
                id="category-dtf-enabled"
                type="checkbox"
                checked={dtfEnabled}
                onChange={(e) => setDtfEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-teal-700"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">DTF logos</span>
                <span className="block text-xs text-gray-600">
                  Adds the optional DTF logo box (width × height per logo) under &quot;+ More options&quot; in Quotation and Customer Invoice for this category.
                </span>
              </span>
            </label>

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

                    {/* Price Modifier / Optional flags */}
                    <div className="flex items-center gap-4 mb-3 ml-1">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!subCat.is_modifier}
                          onChange={() => handleToggleSubCategoryFlag(subCatIndex, 'is_modifier')}
                          className="rounded border-gray-300"
                        />
                        Price Modifier (adjusts price, e.g. Full Sleeve = +50 — not a separate priced combination)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!subCat.is_optional}
                          onChange={() => handleToggleSubCategoryFlag(subCatIndex, 'is_optional')}
                          className="rounded border-gray-300"
                        />
                        Optional (hidden by default, shown via a &quot;+&quot; button)
                      </label>
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
                          <label
                            className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer whitespace-nowrap"
                            title="Dye: no MOQ charges, the dye rate (Ideal Pricing page) applies instead"
                          >
                            <input
                              type="checkbox"
                              checked={!!option && (subCat.dye_options || []).includes(option)}
                              disabled={!option.trim()}
                              onChange={() => handleToggleDyeOption(subCatIndex, option)}
                              className="rounded border-gray-300"
                            />
                            Dye
                          </label>
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
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase w-48">Main Category</th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Sub-Categories &amp; Options</th>
                  <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => {
                  const busy = deletingId === category.id;
                  return (
                    <tr key={category.id} className="align-top hover:bg-gray-50">
                      {/* Name + DTF badge, sub-category count and date underneath */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900">{category.main_category}</span>
                          {category.dtf_enabled && (
                            <span className="rounded bg-teal-700 px-1.5 py-px text-[10px] font-bold tracking-wide text-white">DTF</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {category.sub_categories.length} sub-categor{category.sub_categories.length === 1 ? 'y' : 'ies'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added {new Date(category.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </td>

                      {/* One row per sub-category: name + tags, then its options as chips */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          {category.sub_categories.map((sc, idx) => (
                            <div key={idx} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                              <div className="flex flex-wrap items-center gap-1 sm:w-44 sm:shrink-0 sm:pt-0.5">
                                <span className="text-xs font-semibold text-gray-800">{sc.sub_category}</span>
                                {sc.is_modifier && (
                                  <span
                                    className="rounded bg-indigo-50 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-indigo-600"
                                    title="Price modifier: adjusts the base price"
                                  >
                                    Mod
                                  </span>
                                )}
                                {sc.is_optional && (
                                  <span
                                    className="rounded bg-gray-100 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-gray-500"
                                    title="Optional: hidden behind the + button"
                                  >
                                    Opt
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {sc.options.map((o) => {
                                  const dye = (sc.dye_options || []).includes(o);
                                  return (
                                    <span
                                      key={o}
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                                        dye ? 'border-pink-200 bg-pink-50 text-pink-800' : 'border-gray-200 bg-white text-gray-700'
                                      }`}
                                    >
                                      {o}
                                      {dye && <span className="text-[9px] font-bold text-pink-600">DYE</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(category)}
                            disabled={busy}
                            title="Edit"
                            aria-label={`Edit ${category.main_category}`}
                            className="rounded-md p-2 text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            disabled={busy}
                            title="Delete"
                            aria-label={`Delete ${category.main_category}`}
                            className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            {busy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <TrashIcon className="h-5 w-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {categories.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No customer categories found. Click &quot;+ Add Customer Category&quot; to create one.
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
