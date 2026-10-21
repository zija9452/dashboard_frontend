'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { productsApi, Product } from '@/lib/api/products';
import PageHeader from '@/components/ui/PageHeader';
import SearchBox from '@/components/ui/SearchBox';

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

  const totalPages = totalPagesFromApi;

  const [vendors, setVendors] = useState<any[]>([]);

  // Form state. No price/cost/branch: shop prices are set by the warehouse invoice
  // and the warehouse product is saved in the logged-in branch by the backend.
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    discount: 0,
    limited_qty: 0,
    category: '',
    brand_action: '',
    sku: '',
    attributes: '',
    article_no: '',
    warehouse_limited_qty: 0,
    warehouse_cost: 0,
    // Add only: optional opening warehouse stock-in (same as the Stock In page)
    initial_stock: 0,
    vendor_id: ''
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

  // Fetch warehouse vendors (for the opening stock-in)
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/warehouse-vendors/', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching warehouse vendors:', error);
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
    fetchVendors();
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
      } else {
        // Handle non-ok responses
        if (response.status === 504) {
          showToast('Request timeout. Please try again.', 'error');
        } else if (response.status === 500) {
          showToast('Internal server error', 'error');
        } else if (response.status === 401 || response.status === 403) {
          showToast('Session expired. Please login again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          showToast('Failed to fetch warehouse products', 'error');
        }
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
  const resetForm = async () => {
    const newBarcode = await generateBarcode();
    setFormData({
      name: '',
      barcode: newBarcode,
      discount: 0,
      limited_qty: 0,
      category: '',
      brand_action: '',
      sku: '',
      attributes: '',
      article_no: '',
      warehouse_limited_qty: 0,
      warehouse_cost: 0,
      initial_stock: 0,
      vendor_id: ''
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

    if (!editingProduct && formData.vendor_id && !(Number(formData.initial_stock) > 0)) {
      showToast('Enter Warehouse Stock for the selected vendor', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Price/cost/branch are not sent: an edit keeps the shop prices as they are
      const basePayload = {
        sku: formData.sku || `SKU-${Date.now()}`,
        name: formData.name,
        barcode: formData.barcode,
        discount: Number(formData.discount),
        category: formData.category,
        limited_qty: Number(formData.limited_qty),
        brand_action: formData.brand_action,
        is_warehouse_product: true, // Auto-set to true
        article_no: userRole === 'warehouse' || userRole === 'admin' ? formData.article_no : undefined,
        warehouse_limited_qty: userRole === 'warehouse' || userRole === 'admin' ? formData.warehouse_limited_qty : Number(formData.warehouse_limited_qty),
        warehouse_cost: Number(formData.warehouse_cost)
      };

      if (editingProduct) {
        // Do NOT include stock_level in update — stock is managed via stock-in/out
        await productsApi.updateProduct(editingProduct.pro_id, basePayload);
        Swal.fire({
          title: 'Updated!',
          text: 'Warehouse product has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // Shop prices start at 0; the first warehouse invoice to a shop sets them
        const created: any = await productsApi.createProduct({
          ...basePayload, unit_price: 0, cost_price: 0, stock_level: 0
        } as any);

        const initialStock = Number(formData.initial_stock);
        let stockMessage = '';
        if (initialStock > 0 && created?.id) {
          const response = await fetch('/api/warehouse-stock?action=in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              product_id: created.id,
              qty: initialStock,
              vendor_id: formData.vendor_id || null,
              cost_price: Number(formData.warehouse_cost),
              ref: `W_IN_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            stockMessage = ` But stock was not added: ${errorData.error || errorData.detail || 'failed'}. Add it from Stock In.`;
          }
        }

        if (stockMessage) {
          Swal.fire('Created, stock not added', `Warehouse product has been created.${stockMessage}`, 'warning');
        } else {
          Swal.fire({
            title: 'Created!',
            text: 'Warehouse product has been created successfully.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        }
      }

      await fetchProducts();
      await resetForm();
      setSubmitting(false);
    } catch (error: any) {
      // Extract error message from response
      let errorMessage = 'Failed to save warehouse product';
      
      // Backend returns error in different formats, check all possibilities
      if (error?.response?.data?.detail?.error?.message) {
        // Format: { detail: { error: { message: "..." } } }
        errorMessage = error.response.data.detail.error.message;
      } else if (error?.response?.data?.detail?.message) {
        // Format: { detail: { message: "..." } }
        errorMessage = error.response.data.detail.message;
      } else if (error?.response?.data?.detail) {
        // Format: { detail: "..." } (string)
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.error) {
        // Format: { error: "..." }
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        // Format: { message: "..." }
        errorMessage = error.response.data.message;
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
        barcode: fullProduct.pro_barcode,
        discount: fullProduct.pro_dis,
        limited_qty: fullProduct.limitedquan,
        category: fullProduct.cat_id_fk,
        brand_action: fullProduct.brand,
        sku: '',
        attributes: fullProduct.pro_image,
        // Warehouse fields
        article_no: fullProduct.article_no || '',
        warehouse_limited_qty: fullProduct.warehouse_limited_qty || 0,
        warehouse_cost: fullProduct.warehouse_cost || 0,
        initial_stock: 0,
        vendor_id: ''
      });
      setShowAddForm(true);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      let errorMessage = 'Failed to load product details';
      if (error?.response?.data?.detail) errorMessage = error.response.data.detail;
      showToast(errorMessage, 'error');
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
          text: 'Warehouse product has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK'
        });
      } catch (error: any) {
        console.error('Error deleting product:', error);
        setDeletingId(null);
        
        const status = error?.response?.status;
        const errorData = error?.response?.data;
        const errorMessage = errorData?.detail || errorData?.error || 'Failed to delete warehouse product';

        // Check for constraint violations
        if (status === 400 || status === 409) {
          Swal.fire({
            title: 'Cannot Delete!',
            text: errorMessage.includes('referenced') || errorMessage.includes('foreign key') 
              ? 'This product is still referenced by invoices or other records and cannot be deleted.'
              : errorMessage,
            icon: 'error',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
          });
        } else {
          if (!Swal.isVisible()) {
            Swal.fire({
              title: 'Error!',
              text: errorMessage,
              icon: 'error',
              confirmButtonColor: '#3085d6',
              confirmButtonText: 'OK'
            });
          }
        }
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-2 py-5">
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
                    barcode: newBarcode,
                    discount: 0,
                    limited_qty: 0,
                    category: '',
                    brand_action: '',
                    sku: '',
                    attributes: '',
                    article_no: '',
                    warehouse_limited_qty: 0,
                    warehouse_cost: 0,
                    initial_stock: 0,
                    vendor_id: ''
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
        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          resetPage={() => setCurrentPage(1)}
          id="searchInput"
          placeholder="Search by name or barcode..."
          boxClassName="relative flex-1"
          clearWrapperClassName="flex gap-2 w-full sm:w-auto"
        />
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
                <label className="block text-sm font-medium mb-1">Select Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select Brand *</label>
                <select
                  name="brand_action"
                  value={formData.brand_action}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
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
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Warehouse Cost *</label>
                    <input
                      type="number"
                      name="warehouse_cost"
                      value={formData.warehouse_cost || ''}
                      onChange={handleInputChange}
                      className="regal-input w-full"
                      placeholder="Enter warehouse cost"
                      step="1"
                      min="1"
                      required
                    />
                  </div>

                  {!editingProduct && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Warehouse Stock (Optional)</label>
                        <input
                          type="number"
                          name="initial_stock"
                          value={formData.initial_stock || ''}
                          onChange={handleInputChange}
                          className="regal-input w-full"
                          placeholder="Opening warehouse stock"
                          step="1"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Warehouse Vendor (Optional)</label>
                        <select
                          name="vendor_id"
                          value={formData.vendor_id}
                          onChange={handleInputChange}
                          className="regal-input w-full"
                        >
                          <option value="">No Vendor</option>
                          {vendors.map(vendor => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
           
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
                  <th className="px-2 py-5 text-left w-24">Barcode</th>
                  <th className="px-2 py-5 w-20">Discount</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 text-left w-28">Brand</th>
                  <th className="px-2 py-5 text-left w-24">Article No</th>
                  <th className="px-2 py-5 w-24">Warehouse Stock</th>
                  <th className="px-2 py-5 w-24">Warehouse Cost</th>
                  <th className="px-2 py-5 w-28">Warehouse Limited Qty</th>
                 
               
                  <th className="px-2 py-5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.pro_id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">{product.pro_name}</td>
                    <td className="px-2 py-4">{product.pro_barcode || '-'}</td>
                    <td className="px-2 py-4  text-center">{product.pro_dis !== undefined && product.pro_dis !== null ? `${product.pro_dis}%` : '0%'}</td>
                    <td className="px-2 py-4">{product.cat_id_fk || '-'}</td>
                    <td className="px-2 py-4">{product.brand || '-'}</td>
                    
                    <td className="px-2 py-4 text-center">{product.article_no || '-'}</td>
                        <td className="px-2 py-4 text-center">{product.warehouse_stock ?? 0}</td>
                        <td className="px-2 py-4 text-center">{product.warehouse_cost ?? 0}</td>
                        <td className="px-2 py-4 text-center">{product.warehouse_limited_qty ?? 0}</td>
                    
                  
                    <td className="px-2 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          disabled={editingId === product.pro_id || deletingId === product.pro_id}
                          className={`${
                            editingId === product.pro_id || deletingId === product.pro_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
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
                          className={`${
                            deletingId === product.pro_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
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
