'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { productsApi, Product } from '@/lib/api/products';

interface Category {
  id: string;
  name: string;
  branch: string;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  created_at: string;
}

const ProductsPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Generate unique barcode by calling backend API (production-ready approach)
  const generateBarcode = async (): Promise<string> => {
    try {
      const response = await fetch('/api/products/generate-barcode', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        return data.barcode;
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
    // Fallback to local generation if API fails
    const prefix = "690";
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
    const baseCode = prefix + randomPart;
    let sum = 0;
    for (let i = 0; i < baseCode.length; i++) {
      sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return baseCode + checkDigit;
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Prevent duplicate submissions
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);

  // Calculate totalPages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Form state - barcode will be set when form is shown
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
    desc: '',
    attributes: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Predefined branch options
  const branchOptions = [
    'European Sports Light House'
  ];

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await productsApi.getProducts(currentPage, pageSize, searchTerm || undefined);

      console.log('Products fetched:', response.data.length);
      console.log('Total items:', response.total);
      console.log('Total pages:', response.totalPages);
      console.log('Current page:', currentPage);
      setProducts(response.data);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Failed to fetch products', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/category/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brand/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [currentPage, searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? Number(value) : value
    }));
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = async () => {
    const newBarcode = await generateBarcode();
    setFormData({
      name: '',
      unit_price: 0,
      cost_price: 0,
      barcode: newBarcode, // Generate new barcode on form reset
      discount: 0,
      limited_qty: 0,
      category: '',
      branch: '',
      brand_action: '',
      sku: '',
      desc: '',
      attributes: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
    setSelectedImage(null);
    setImagePreview('');
  };

  // Close form without resetting (for cancel button)
  const closeForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  // Generate SKU
  const generateSKU = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substring(5);
    return `${prefix}-${timestamp}`;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (submitting) return;
    
    setSubmitting(true);

    try {
      let imageUrl = formData.attributes;

      // Upload image if selected
      if (selectedImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', selectedImage);
        imageFormData.append('upload_preset', 'regal-pos'); // You may need to configure this

        // For now, we'll store the image as base64 in attributes field
        imageUrl = imagePreview;
      }

      const payload = {
        sku: formData.sku || generateSKU(formData.name),
        name: formData.name,
        desc: formData.desc,
        unit_price: Number(formData.unit_price),
        cost_price: Number(formData.cost_price),
        tax_rate: 0,
        vendor_id: null,
        stock_level: 0,
        attributes: imageUrl,
        barcode: formData.barcode,
        discount: Number(formData.discount),
        category: formData.category,
        branch: formData.branch,
        limited_qty: Number(formData.limited_qty),
        brand_action: formData.brand_action
      };

      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.pro_id, payload);
        Swal.fire({
          title: 'Updated!',
          text: 'Product has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        await productsApi.createProduct(payload);
        Swal.fire({
          title: 'Created!',
          text: 'Product has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }

      // Clear cache to fetch fresh data
      productsApi.clearCache();
      await resetForm();
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit product
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.pro_name,
      unit_price: product.pro_price,
      cost_price: product.pro_cost,
      barcode: product.pro_barcode,
      discount: product.pro_dis,
      limited_qty: product.limitedquan,
      category: product.cat_id_fk,
      branch: product.branch,
      brand_action: product.brand,
      sku: '',
      desc: '',
      attributes: product.pro_image
    });
    // Set image preview if exists
    if (product.pro_image) {
      setImagePreview(product.pro_image);
    }
    setShowAddForm(true);
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
      try {
        await productsApi.deleteProduct(id);

        // Clear cache to fetch fresh data
        productsApi.clearCache();

        // Refresh product list from backend
        await fetchProducts();

        Swal.fire({
          title: 'Deleted!',
          text: 'Product has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-0">
      {/* Heading */}
      <h1 className="text-2xl font-medium text-center mb-6">View Product</h1>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (!showAddForm) {
                // Opening form - generate new barcode synchronously with fallback
                const prefix = "690";
                const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
                const baseCode = prefix + randomPart;
                let sum = 0;
                for (let i = 0; i < baseCode.length; i++) {
                  sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
                }
                const checkDigit = (10 - (sum % 10)) % 10;
                const localBarcode = baseCode + checkDigit;
                
                setFormData({
                  name: '',
                  unit_price: 0,
                  cost_price: 0,
                  barcode: localBarcode,
                  discount: 0,
                  limited_qty: 0,
                  category: '',
                  branch: '',
                  brand_action: '',
                  sku: '',
                  desc: '',
                  attributes: ''
                });
                setEditingProduct(null);
                setShowAddForm(true);
                setSelectedImage(null);
                setImagePreview('');
              } else {
                // Closing form
                setShowAddForm(false);
              }
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showAddForm ? 'Cancel' : '+ Add Product'}
          </button>
          
          <button
            onClick={() => router.push('/category')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Category
          </button>
          
          <button
            onClick={() => router.push('/brand')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Brand
          </button>
        </div>

        {/* Right side - Search */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
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
            Search
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                  step="0.01"
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
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Barcode
                  <span className="text-xs text-gray-500 ml-2">(Auto-generated, scanner compatible)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    className="regal-input w-full font-mono"
                    placeholder="Auto-generated barcode"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const newBarcode = await generateBarcode();
                      setFormData(prev => ({ ...prev, barcode: newBarcode }));
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm whitespace-nowrap"
                    title="Generate new barcode"
                  >
                    🔄 Regenerate
                  </button>
                </div>
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
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select Branch *</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <input
                  type="file"
                  name="product_image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full my-2"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Product preview" className="h-32 w-32 object-cover rounded-lg border" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`regal-btn bg-regal-yellow text-regal-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {editingProduct ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className={`regal-btn bg-gray-300 text-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Close
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
              <thead className="bg-gray-100">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-3 py-5 text-left w-12">S.No</th>
                  <th className="px-2 py-5 text-left w-24">Image</th>
                  <th className="px-2 py-5 text-left w-32">Name</th>
                  <th className="px-2 py-5 text-left w-20">Price</th>
                  <th className="px-2 py-5 text-left w-20">Cost</th>
                  <th className="px-2 py-5 text-left w-32">Barcode</th>
                  <th className="px-2 py-5 text-left w-24">Discount</th>
                  <th className="px-2 py-5 text-left w-20">Stock</th>
                  <th className="px-2 py-5 text-left w-28">Limited Qty</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 text-left w-32">Branch</th>
                  <th className="px-2 py-5 text-left">Brand</th>
                  <th className="px-2 py-5 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.pro_id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm text-gray-900">{((currentPage - 1) * pageSize) + index + 1}</td>
                    <td className="px-3 py-4 text-sm">
                      {product.pro_image ? (
                        <img src={product.pro_image} alt={product.pro_name} className="h-12 w-12 object-cover rounded flex-shrink-0" style={{minWidth: '48px'}} />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0" style={{minWidth: '48px'}}>
                          <span className="text-xs text-gray-400">No Img</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">{product.pro_name}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.pro_price.toFixed(2)}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.pro_cost.toFixed(2)}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.pro_barcode || 'N/A'}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.pro_dis}%</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.stock || 0}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.limitedquan || 0}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.cat_id_fk || 'N/A'}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.branch || 'N/A'}</td>
                    <td className="px-2 py-4 text-sm text-gray-900">{product.brand || 'N/A'}</td>
                    <td className="px-2 py-4 text-sm text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.pro_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {products.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No products found.
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
          baseUrl="/products"
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default ProductsPage;
