'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { productsApi, Product } from '@/lib/api/products';
import PageHeader from '@/components/ui/PageHeader';

const ShopWarehouseProductsPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingForm, setOpeningForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Categories and brands
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const totalPages = Math.min(totalPagesFromApi, 5);

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    unit_price: 0,
    cost_price: 0,
    barcode: '',
    discount: 0,
    limited_qty: 0,
    category: '',
    branch: '',
    brand_action: '',
    sku: '',
    attributes: '',
    // Warehouse fields (only article_no and warehouse_limited_qty, no warehouse_stock)
    article_no: '',
    warehouse_limited_qty: 0
  });

  // Generate barcode from backend
  const generateBarcode = async (): Promise<string> => {
    const response = await fetch('/api/products/generatebarcode', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to generate barcode');
    }
    const data = await response.json();
    return data.barcode;
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/category/?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const categoryList = data?.data || data?.categories || (Array.isArray(data) ? data : []);
        setCategories(categoryList);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brand/?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const brandList = data?.data || data?.brands || (Array.isArray(data) ? data : []);
        setBrands(brandList);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role) {
            setUserRole(data.user.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
    fetchCategories();
    fetchBrands();
  }, []);

  // Fetch products (only where is_warehouse_product = true)
  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Custom fetch for shop-warehouse products
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      params.append('warehouse', 'true');
      if (searchTerm) {
        params.append('search_string', searchTerm);
      }

      const response = await fetch(`/api/products/viewproduct?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only warehouse products
        const warehouseProducts = data.data || [];
        setProducts(warehouseProducts);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.total_pages || 0);
      }
    } catch (error: any) {
      console.error('Error fetching warehouse products:', error);
      showToast('Failed to fetch warehouse products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      unit_price: 0,
      cost_price: 0,
      barcode: '',
      discount: 0,
      limited_qty: 0,
      category: '',
      branch: '',
      brand_action: '',
      sku: '',
      attributes: '',
      article_no: '',
      warehouse_limited_qty: 0
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  // Close form
  const closeForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const payload = {
        sku: formData.sku || `SKU-${Date.now()}`,
        name: formData.name,
        unit_price: Number(formData.unit_price),
        cost_price: Number(formData.cost_price),
        stock_level: 0,
        barcode: formData.barcode,
        discount: Number(formData.discount),
        category: formData.category,
        branch: formData.branch,
        limited_qty: Number(formData.limited_qty),
        brand_action: formData.brand_action,
        is_warehouse_product: true, // Auto-set to true
        article_no: userRole === 'warehouse' ? formData.article_no : undefined,
        warehouse_limited_qty: userRole === 'warehouse' ? formData.warehouse_limited_qty : undefined
      };

      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.pro_id, payload);
        Swal.fire({
          title: 'Updated!',
          text: 'Warehouse product has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        await productsApi.createProduct(payload);
        Swal.fire({
          title: 'Created!',
          text: 'Warehouse product has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }

      await fetchProducts();
      resetForm();
      setSubmitting(false);
    } catch (error: any) {
      let errorMessage = 'Failed to save warehouse product';

      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      showToast(errorMessage, 'error');
      setSubmitting(false);
    }
  };

  // Edit product
  const handleEdit = async (product: Product) => {
    setEditingId(product.pro_id);
    try {
      const fullProduct = await productsApi.getProductById(product.pro_id);

      setEditingProduct(fullProduct);
      setFormData({
        name: fullProduct.pro_name,
        unit_price: fullProduct.pro_price,
        cost_price: fullProduct.pro_cost,
        barcode: fullProduct.pro_barcode,
        discount: fullProduct.pro_dis,
        limited_qty: fullProduct.limitedquan,
        category: fullProduct.cat_id_fk,
        branch: fullProduct.branch,
        brand_action: fullProduct.brand,
        sku: '',
        attributes: fullProduct.pro_image,
        // Warehouse fields
        article_no: fullProduct.article_no || '',
        warehouse_limited_qty: fullProduct.warehouse_limited_qty || 0
      });
      setShowAddForm(true);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching product details:', error);
      showToast('Failed to load product details', 'error');
    } finally {
      setEditingId(null);
    }
  };

  // Delete product
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
        await productsApi.deleteProduct(id);
        await fetchProducts();
        setDeletingId(null);
        Swal.fire({
          title: 'Deleted!',
          text: 'Warehouse product has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        setDeletingId(null);
        showToast('Failed to delete warehouse product', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4">
      <PageHeader title="Warehouse Products" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              if (!showAddForm && !openingForm) {
                // Opening form - generate new barcode from backend API
                setOpeningForm(true);
                try {
                  const newBarcode = await generateBarcode();
                  setFormData({
                    name: '',
                    unit_price: 0,
                    cost_price: 0,
                    barcode: newBarcode,
                    discount: 0,
                    limited_qty: 0,
                    category: '',
                    branch: '',
                    brand_action: '',
                    sku: '',
                    attributes: '',
                    article_no: '',
                    warehouse_limited_qty: 0
                  });
                  setEditingProduct(null);
                  setShowAddForm(true);
                } catch (error) {
                  showToast('Failed to generate barcode. Please try again.', 'error');
                } finally {
                  setOpeningForm(false);
                }
              } else {
                setShowAddForm(false);
              }
            }}
            disabled={openingForm}
            className={`regal-btn bg-regal-yellow text-regal-black whitespace-nowrap ${
              openingForm ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {openingForm ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              showAddForm ? 'Cancel' : '+ Add Warehouse Product'
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <input
              id="searchInput"
              type="text"
              placeholder="Search by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                }
              }}
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
              setCurrentPage(1);
              document.getElementById('searchInput')?.focus();
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
            {editingProduct ? 'Edit Warehouse Product' : 'Add New Warehouse Product'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Price *</label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price || ''}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter price"
                  step="1"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cost *</label>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price || ''}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter cost"
                  step="1"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Barcode
                  <span className="text-xs text-gray-500 ml-2">(Auto-generated, scanner compatible)</span>
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  readOnly
                  className="regal-input w-full font-mono bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-generated barcode"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter discount"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Limited Quantity *</label>
                <input
                  type="number"
                  name="limited_qty"
                  value={formData.limited_qty || ''}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter limited quantity"
                  step="1"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
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
                  {branchOptions.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <select
                  name="brand_action"
                  value={formData.brand_action}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.name}>{brand.name}</option>
                  ))}
                </select>
              </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Article No (Optional)</label>
                    <input
                      type="text"
                      name="article_no"
                      value={formData.article_no}
                      onChange={handleInputChange}
                      className="regal-input w-full"
                      placeholder="Enter article number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Warehouse Limited Qty</label>
                    <input
                      type="number"
                      name="warehouse_limited_qty"
                      value={formData.warehouse_limited_qty || ''}
                      onChange={handleInputChange}
                      className="regal-input w-full"
                      placeholder="Enter warehouse limited qty"
                      step="1"
                      min="0"
                    />
                  </div>
           
            </div>

            <div className="flex gap-2 mt-4">
              
              <button
                type="submit"
                disabled={submitting}
                className={`regal-btn bg-regal-yellow text-regal-black ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="regal-btn bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
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
                  <th className="px-3 py-5 text-left w-12">S.No</th>
                  <th className="px-2 py-5 text-left w-40">Product</th>
                  <th className="px-2 py-5 w-20">Price</th>
                  <th className="px-2 py-5 w-20">Cost</th>
                  <th className="px-2 py-5 text-left w-24">Barcode</th>
                  <th className="px-2 py-5 w-20">Discount</th>
                  <th className="px-2 py-5 w-20">Stock</th>
                  <th className="px-2 py-5 w-20">Limited Qty</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 text-left w-28">Brand</th>
                  <th className="px-2 py-5 text-left w-24">Article No</th>
                  <th className="px-2 py-5 w-24">Warehouse Stock</th>
                  <th className="px-2 py-5 w-28">Warehouse Limited Qty</th>
                 
               
                  <th className="px-2 py-5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.pro_id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">{product.pro_name}</td>
                    <td className="px-2 py-4  text-center">{product.pro_price}</td>
                    <td className="px-2 py-4 text-center">{product.pro_cost}</td>
                    <td className="px-2 py-4">{product.pro_barcode || '-'}</td>
                    <td className="px-2 py-4  text-center">{product.pro_dis !== undefined && product.pro_dis !== null ? `${product.pro_dis}%` : '0%'}</td>
                    <td className="px-2 py-4 text-center">{product.stock}</td>
                    <td className="px-2 py-4 text-center">{product.limitedquan}</td>
                    <td className="px-2 py-4">{product.cat_id_fk || '-'}</td>
                    <td className="px-2 py-4">{product.brand || '-'}</td>
                    
                    <td className="px-2 py-4 text-center">{product.article_no || '-'}</td>
                        <td className="px-2 py-4 text-center">{product.warehouse_stock ?? 0}</td>
                        <td className="px-2 py-4 text-center">{product.warehouse_limited_qty ?? 0}</td>
                    
                  
                    <td className="px-2 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          disabled={editingId === product.pro_id}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {editingId === product.pro_id ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            'Edit'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(product.pro_id)}
                          disabled={deletingId === product.pro_id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deletingId === product.pro_id ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

        {products.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No warehouse products found.
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
            baseUrl="/warehouse-products"
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ShopWarehouseProductsPage;
