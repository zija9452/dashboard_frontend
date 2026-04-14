'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { productsApi, Product } from '@/lib/api/products';
import PageHeader from '@/components/ui/PageHeader';
import { CloudinaryImage, IMAGE_SIZES } from '@/lib/cloudinary';

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

  // User role state for role-based access control
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Generate unique barcode by calling backend API (production-ready approach)
  // Backend uses sequential auto-increment: 690000000, 690000001, etc.
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

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Prevent duplicate submissions
  const [editingId, setEditingId] = useState<string | null>(null); // Track which product is being edited
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which product is being deleted
  const [openingForm, setOpeningForm] = useState(false); // Track form opening state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  // Calculate totalPages - limit to max 5 pages
  const totalPages = Math.min(totalPagesFromApi, 5);

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      setTotalPagesFromApi(response.totalPages);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      
      // Handle different error types
      if (error?.response?.data?.type === 'TIMEOUT' || error?.response?.status === 504) {
        showToast('Request timeout. Please try again.', 'error');
      } else if (error?.response?.status === 500) {
        const errorMsg = error?.response?.data?.error || 'Internal server error';
        showToast(`Server error: ${errorMsg}`, 'error');
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const errorMsg = error?.response?.data?.error || 'Failed to fetch products';
        showToast(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories - get ALL categories (no pagination for dropdown)
  const fetchCategories = async () => {
    try {
      // Fetch with large limit to get all categories for dropdown
      const response = await fetch('/api/category/?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format: { data: [...], page, limit, total, totalPages }
        const categoryList = data?.data || data?.categories || (Array.isArray(data) ? data : []);
        setCategories(categoryList);
        console.log('Categories fetched:', categoryList.length);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch brands - get ALL brands (no pagination for dropdown)
  const fetchBrands = async () => {
    try {
      // Fetch with large limit to get all brands for dropdown
      const response = await fetch('/api/brand/?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format: { data: [...], page, limit, total, totalPages }
        const brandList = data?.data || data?.brands || (Array.isArray(data) ? data : []);
        setBrands(brandList);
        console.log('Brands fetched:', brandList.length);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    // Fetch user role for role-based access control
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
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
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

  // Handle image selection and upload to Cloudinary
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Delete existing image from Cloudinary if one exists
      if (imagePreview && formData.attributes) {
        try {
          await productsApi.deleteImage(formData.attributes, editingProduct?.pro_id);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue with new upload anyway
        }
      }

      setUploadingImage(true);
      setSelectedImage(file);

      // Upload to Cloudinary immediately
      try {
        const { url } = await productsApi.uploadImage(file);

        // Set the URL as preview and for form submission
        setImagePreview(url);
        setFormData(prev => ({ ...prev, attributes: url }));
      } catch (error) {
        console.error('Image upload error:', error);
        showToast('Failed to upload image', 'error');
        // Fallback to local preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Handle image deletion
  const handleDeleteImage = async () => {
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
      setDeletingImage(true);
      try {
        // Delete image from Cloudinary via backend
        // Pass product ID if editing an existing product
        await productsApi.deleteImage(formData.attributes, editingProduct?.pro_id);
        
        // Clear image state
        setImagePreview('');
        setFormData(prev => ({ ...prev, attributes: '' }));
        setSelectedImage(null);
        
        Swal.fire({
          title: 'Deleted!',
          text: 'Image has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting image:', error);
        showToast('Failed to delete image', 'error');
      } finally {
        setDeletingImage(false);
      }
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
    setUploadingImage(false);
    setDeletingImage(false);
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

      // Only send fields that exist in ProductCreate model
      const payload = {
        sku: formData.sku || `SKU-${Date.now()}`, // Generate SKU if not provided
        name: formData.name,
        unit_price: Number(formData.unit_price),
        cost_price: Number(formData.cost_price),
        stock_level: 0, // Default stock level for new products
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

      // Clear cache and refresh products
      productsApi.clearCache();
      await fetchProducts();
      await resetForm();
      setSubmitting(false);
    } catch (error: any) {
      // Extract error message from response
      let errorMessage = 'Failed to save product';
      
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

  // Edit product - fetch full details including image
  const handleEdit = async (product: Product) => {
    setEditingId(product.pro_id);
    try {
      // Fetch full product details from backend (includes image data)
      const fullProduct = await productsApi.getProductById(product.pro_id);

      console.log('📝 Editing product:', fullProduct);
      console.log('🖼️ Product image:', fullProduct.pro_image);

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
        desc: '',
        attributes: fullProduct.pro_image
      });
      // Set image preview if exists, otherwise clear it
      if (fullProduct.pro_image && fullProduct.pro_image.startsWith('http')) {
        setImagePreview(fullProduct.pro_image);
      } else {
        setImagePreview('');  // Clear previous image
      }
      setShowAddForm(true);

      // Auto-scroll to top smoothly to show the edit form
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

        // Clear cache to fetch fresh data
        productsApi.clearCache();

        // Refresh product list from backend
        await fetchProducts();

        setDeletingId(null);
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
        setDeletingId(null);
        showToast('Failed to delete product', 'error');
      }
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4">
      <PageHeader title="View Product" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        {/* Action Buttons - desktop pe left, mobile pe upar */}
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
                    desc: '',
                    attributes: ''
                  });
                  setEditingProduct(null);
                  setShowAddForm(true);
                  setSelectedImage(null);
                  setImagePreview('');
                } catch (error) {
                  showToast('Failed to generate barcode. Please try again.', 'error');
                } finally {
                  setOpeningForm(false);
                }
              } else {
                // Closing form
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
              showAddForm ? 'Cancel' : '+ Add Product'
            )}
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

        {/* Search bar - desktop pe right, mobile pe niche */}
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
                <div className="flex items-start gap-2">
                  {/* Upload Spinner */}
                  {uploadingImage && (
                    <div className="flex items-center justify-center h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <div className="text-center">
                        <svg className="animate-spin h-8 w-8 text-regal-yellow mx-auto mb-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-xs text-gray-600">Uploading...</p>
                      </div>
                    </div>
                  )}

                  {/* Image Preview with View/Delete Buttons */}
                  {!uploadingImage && imagePreview && (
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <CloudinaryImage
                          src={imagePreview}
                          alt="Product preview"
                          size="medium"
                          className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer"
                          priority={true}
                        />
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setModalImages([imagePreview]);
                            setCurrentImageIndex(0);
                            setShowImageModal(true);
                          }}
                          className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View image"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        disabled={deletingImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete image"
                      >
                        {deletingImage ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : null}
                        <span>Delete Image</span>
                      </button>
                    </div>
                  )}

                  {/* Choose File Input (shown when no image) */}
                  {!uploadingImage && !imagePreview && (
                    <input
                      type="file"
                      name="product_image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full my-2"
                    />
                  )}
                </div>
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
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-3 py-5 text-left w-12">S.No</th>
                  <th className="px-2 py-5 text-left w-52">Name</th>
                  <th className="px-2 py-5 text-left w-20">Price</th>
                  {!roleLoading && userRole !== 'cashier' && (
                    <th className="px-2 py-5 text-left w-20">Cost</th>
                  )}
                  <th className="px-2 py-5 text-left w-28">Barcode</th>
                  <th className="px-2 py-5 text-left w-20">Discount</th>
                  <th className="px-2 py-5 w-20">Stock</th>
                  <th className="px-2 py-5 text-left w-24">Limited Qty</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 text-left w-32">Branch</th>
                  <th className="px-2 py-5 text-left w-24">Brand</th>
                  <th className="px-2 py-5 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={product.pro_id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">{((currentPage - 1) * pageSize) + index + 1}</td>
                    <td className="px-3 py-4">{product.pro_name}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{product.pro_price.toFixed(2)}</td>
                    {!roleLoading && userRole !== 'cashier' && (
                      <td className="px-2 py-4 whitespace-nowrap">{product.pro_cost.toFixed(2)}</td>
                    )}
                    <td className="px-2 py-4 whitespace-nowrap">{product.pro_barcode || 'N/A'}</td>
                    <td className="px-2 py-4 text-center whitespace-nowrap">{product.pro_dis}%</td>
                    <td className="px-2 py-4 text-center whitespace-nowrap">{product.stock || 0}</td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">{product.limitedquan || 0}</td>
                    <td className="px-2 py-4">{product.cat_id_fk || 'N/A'}</td>
                    <td className="px-2 py-4">{product.branch || 'N/A'}</td>
                    <td className="px-2 py-4">{product.brand || 'N/A'}</td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleEdit(product)}
                          disabled={editingId === product.pro_id || deletingId === product.pro_id}
                          className={`${
                            editingId === product.pro_id || deletingId === product.pro_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-900'
                          }`}
                        >
                          {editingId === product.pro_id ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            'Edit'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(product.pro_id)}
                          disabled={deletingId === product.pro_id}
                          className={`hover:text-red-900 ${
                            deletingId === product.pro_id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600'
                          }`}
                        >
                          {deletingId === product.pro_id ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={modalImages[currentImageIndex]}
            alt="Product preview"
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
