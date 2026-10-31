'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { productsApi, Product } from '@/lib/api/products';
import PageHeader from '@/components/ui/PageHeader';
import SearchBox from '@/components/ui/SearchBox';
import { useBatchLines, OpenBatch, batchNo, batchOption, batchPrices, batchPriceBreakdown, billOf, fetchOpenBatches, rangeText } from '@/lib/batchLines';
import VendorBillModal from '@/components/VendorBillModal';

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

  // Rows with batches open on click to their Old Stock + batch lines
  const { lines: openLines, toggle: toggleBatches } = useBatchLines((message) => showToast(message, 'error'));

  // Add only: the opening stock can go into an open batch of the chosen vendor
  const [allOpenBatches, setAllOpenBatches] = useState<OpenBatch[]>([]);
  const [batchId, setBatchId] = useState(''); // '' = no batch
  const [batchSelling, setBatchSelling] = useState('');
  const [batchSellingEdited, setBatchSellingEdited] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false); // add / edit the vendor's bill in the batch
  // Shop price follows the warehouse cost / batch price while ticked (new product only)
  const [shopCostSame, setShopCostSame] = useState(true);
  const [shopSellSame, setShopSellSame] = useState(true);

  // Form state. Shop cost / selling price are optional (same in both branches); if left
  // empty the warehouse invoice sets them. The branch is set by the backend.
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
    cost_price: 0,
    unit_price: 0,
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

  // All open batches (lots) with their vendors' bills, loaded once when the Add form opens;
  // the newest is picked
  useEffect(() => {
    if (!showAddForm || editingProduct) return;
    fetchOpenBatches().then(setAllOpenBatches).catch((error) => showToast(error.message, 'error'));
  }, [showAddForm, editingProduct]);

  useEffect(() => {
    setBatchId((current) => (allOpenBatches.some((b) => b.id === current) ? current : allOpenBatches[0]?.id || ''));
  }, [allOpenBatches]);

  const selectedBatch = allOpenBatches.find((b) => b.id === batchId) || null;
  // The vendor's bill in this batch; none until the vendor is added to the batch
  const selectedBill = billOf(selectedBatch, formData.vendor_id);
  const replaceBatch = (updated: OpenBatch) =>
    setAllOpenBatches((list) => list.map((b) => (b.id === updated.id ? updated : b)));
  // Opening stock goes into a batch: then there is one selling price, the batch's
  const batchActive = !editingProduct && Number(formData.initial_stock) > 0 && !!selectedBill;
  // What is saved as the shop cost / selling price (both branches)
  const costLinked = !editingProduct && shopCostSame;
  const sellLinked = batchActive && shopSellSame;
  const shopCost = costLinked ? Number(formData.warehouse_cost) || 0 : Number(formData.cost_price) || 0;
  const shopSell = sellLinked ? Number(batchSelling) || 0 : Number(formData.unit_price) || 0;
  const batchPrice = selectedBill && Number(formData.warehouse_cost) > 0
    ? batchPrices(Number(formData.warehouse_cost), selectedBill)
    : null;

  // Batch price follows the warehouse cost until typed by hand
  useEffect(() => {
    if (batchPrice && !batchSellingEdited) setBatchSelling(String(batchPrice.selling));
  }, [batchPrice?.selling, batchSellingEdited]);

  useEffect(() => {
    setBatchSellingEdited(false);
  }, [batchId, formData.vendor_id]);

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
    setShopCostSame(true);
    setShopSellSame(true);
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
      cost_price: 0,
      unit_price: 0,
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

    // A batch with a vendor chosen: the vendor's bill must be in the batch first
    if (!editingProduct && Number(formData.initial_stock) > 0 && selectedBatch && formData.vendor_id && !selectedBill) {
      showToast(`Add the vendor's bill to ${batchNo(selectedBatch.batch_no)} first`, 'error');
      return;
    }

    if (batchActive && !(Number(batchSelling) > 0)) {
      showToast('Batch selling price must be more than 0', 'error');
      return;
    }

    setSubmitting(true);

    try {
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
        // Do NOT include stock_level in update — stock is managed via stock-in/out.
        // Shop cost / price are sent only when changed (the backend copies them to the
        // other branch), so other edits keep a price a warehouse invoice set there.
        const pricePayload: { cost_price?: number; unit_price?: number } = {};
        if (Number(formData.cost_price) !== Number(editingProduct.pro_cost || 0)) {
          pricePayload.cost_price = Number(formData.cost_price);
        }
        if (Number(formData.unit_price) !== Number(editingProduct.pro_price || 0)) {
          pricePayload.unit_price = Number(formData.unit_price);
        }
        await productsApi.updateProduct(editingProduct.pro_id, { ...basePayload, ...pricePayload } as any);
        Swal.fire({
          title: 'Updated!',
          text: 'Warehouse product has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // Shop prices left empty stay 0; the first warehouse invoice to a shop sets them.
        // The backend copies the product (with these prices) to the other branch.
        const created: any = await productsApi.createProduct({
          ...basePayload,
          // Left empty with a batch: the batch's selling price, so it is never 0
          // With a batch the one selling price is the batch's
          unit_price: shopSell,
          cost_price: shopCost,
          stock_level: 0
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
              batch_id: batchActive && selectedBatch ? selectedBatch.id : null,
              selling_price: batchActive ? Number(batchSelling) : null,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            stockMessage = ` But stock was not added: ${errorData.error || errorData.detail || 'failed'}. Add it from Stock In.`;
          } else {
            const data = await response.json().catch(() => ({}));
            (data.branch_warnings || []).forEach((w: string) => showToast(w, 'warning'));
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
        cost_price: fullProduct.pro_cost || 0,
        unit_price: fullProduct.pro_price || 0,
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
                    cost_price: 0,
                    unit_price: 0,
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
                <div>
                  <label className="block text-sm font-medium mb-1">Warehouse Stock</label>
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
              )}


              {/* Step 2 - only when opening stock is entered: where it came from */}
              {!editingProduct && Number(formData.initial_stock) > 0 && (
                <>
                  <div className="md:col-span-3 border-t pt-3 mt-1">
                    <h4 className="text-sm font-semibold text-gray-700">Opening Stock</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch</label>
                    <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="regal-input w-full">
                      {allOpenBatches.map((b) => (
                        <option key={b.id} value={b.id}>{batchOption(b)}</option>
                      ))}
                      <option value="">No batch (old way)</option>
                    </select>
                    {allOpenBatches.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No open batch - make one on Warehouse Batches.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Warehouse Vendor</label>
                    <select
                      name="vendor_id"
                      value={formData.vendor_id}
                      onChange={handleInputChange}
                      className="regal-input w-full"
                    >
                      <option value="">No Vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}{vendor.vendor_code ? ` (${vendor.vendor_code})` : ''}
                        </option>
                      ))}
                    </select>
                    {/* The vendor's bill in the batch: added once, when its goods of this lot arrive */}
                    {selectedBatch && formData.vendor_id && (
                      selectedBill ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Bill Rs. {selectedBill.invoice_total.toLocaleString()} · F {selectedBill.freight_pct}% · C {selectedBill.cartage_pct}% · M {selectedBill.markup_pct}%
                          {selectedBill.locked && <span className="ml-2 text-gray-500">🔒 Locked</span>}
                        </p>
                      ) : (
                        <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs flex items-center justify-between gap-2">
                          <span>Not in {batchNo(selectedBatch.batch_no)} yet</span>
                          <button type="button" onClick={() => setBillModalOpen(true)} className="regal-btn bg-regal-yellow text-regal-black !px-2 !py-1 text-xs whitespace-nowrap">
                            + Add bill
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {selectedBill && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Batch Selling Price</label>
                      <input
                        type="number"
                        value={batchSelling}
                        onChange={(e) => { setBatchSelling(e.target.value); setBatchSellingEdited(true); }}
                        className="regal-input w-full"
                        min="1"
                        step="1"
                        placeholder="Enter warehouse cost first"
                      />
                      {batchPrice && (
                        <p className="text-xs text-gray-500 mt-1" title={batchPriceBreakdown(Number(formData.warehouse_cost), selectedBill).full}>
                          {batchPriceBreakdown(Number(formData.warehouse_cost), selectedBill).short}
                          {batchSellingEdited && Number(batchSelling) !== batchPrice.selling && (
                            <button type="button" onClick={() => setBatchSellingEdited(false)} className="ml-2 text-blue-600 hover:underline">
                              Use Rs. {batchPrice.selling.toLocaleString()}
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Shop price - always last */}
              <div className="md:col-span-3 border-t pt-3 mt-1">
                <h4 className="text-sm font-semibold text-gray-700">Shop Price</h4>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Shop Cost</label>
                <input
                  type="number"
                  name="cost_price"
                  value={costLinked ? formData.warehouse_cost || '' : formData.cost_price || ''}
                  onChange={handleInputChange}
                  className={`regal-input w-full ${costLinked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Shop cost (both branches)"
                  step="any"
                  min="0"
                  disabled={costLinked}
                />
                {!editingProduct && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopCostSame}
                      onChange={(e) => {
                        setShopCostSame(e.target.checked);
                        if (!e.target.checked) setFormData(prev => ({ ...prev, cost_price: prev.warehouse_cost }));
                      }}
                    />
                    Same as warehouse cost
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Shop Selling Price</label>
                <input
                  type="number"
                  name="unit_price"
                  value={sellLinked ? batchSelling : formData.unit_price || ''}
                  onChange={handleInputChange}
                  className={`regal-input w-full ${sellLinked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Selling price (both branches)"
                  step="any"
                  min="0"
                  disabled={sellLinked}
                />
                {batchActive && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopSellSame}
                      onChange={(e) => {
                        setShopSellSame(e.target.checked);
                        if (!e.target.checked) setFormData(prev => ({ ...prev, unit_price: Number(batchSelling) || 0 }));
                      }}
                    />
                    Same as batch selling price
                  </label>
                )}
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
                  <th className="px-2 py-5 text-left w-40">Barcode</th>
                  <th className="px-2 py-5 w-24">Warehouse Cost</th>
                  <th className="px-2 py-5 w-24">Warehouse Stock</th>
                  <th className="px-2 py-5 w-28">Warehouse Limited Qty</th>
                  <th className="px-2 py-5 w-20">Discount</th>
                  <th className="px-2 py-5 text-left w-28">Category</th>
                  <th className="px-2 py-5 text-left w-28">Brand</th>
                  <th className="px-2 py-5 text-left w-24">Article No</th>
                  <th className="px-2 py-5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <React.Fragment key={product.pro_id}>
                  <tr
                    onClick={() => product.batch_count && toggleBatches(product.pro_id)}
                    className={`text-sm text-gray-900 ${product.batch_count ? 'cursor-pointer' : ''} ${product.pro_id in openLines ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-3 py-4 ${product.pro_id in openLines ? 'border-l-4 border-regal-yellow' : ''}`}>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-2 py-4">
                      {product.pro_name}
                      {!!product.batch_count && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-regal-black whitespace-nowrap">
                          {product.batch_count} batch{product.batch_count > 1 ? 'es' : ''} {product.pro_id in openLines ? '▲' : '▼'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4">{product.pro_barcode || '-'}</td>
                    {/* With batches: lowest – highest cost of its lines (each line's own cost below) */}
                    <td className="px-2 py-4 text-center whitespace-nowrap">{product.warehouse_cost_range ? rangeText(product.warehouse_cost_range) : product.warehouse_cost ?? 0}</td>
                    <td className="px-2 py-4 text-center">{product.warehouse_stock ?? 0}</td>
                    <td className="px-2 py-4 text-center">{product.warehouse_limited_qty ?? 0}</td>
                    <td className="px-2 py-4  text-center">{product.pro_dis !== undefined && product.pro_dis !== null ? `${product.pro_dis}%` : '0%'}</td>
                    <td className="px-2 py-4">{product.cat_id_fk || '-'}</td>
                    <td className="px-2 py-4">{product.brand || '-'}</td>
                    <td className="px-2 py-4 text-center">{product.article_no || '-'}</td>
                    <td className="px-2 py-4" onClick={(e) => e.stopPropagation()}>
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
                  {/* Batch lines under the same columns: Old Stock + each vendor batch */}
                  {product.pro_id in openLines && openLines[product.pro_id] === null && (
                    <tr className="bg-gray-50 text-sm text-gray-500">
                      <td></td>
                      <td colSpan={10} className="px-2 py-2">Loading batches...</td>
                    </tr>
                  )}
                  {(openLines[product.pro_id] || []).map((line, lineIndex) => (
                    <tr key={line.label + (line.barcode || '')} className="bg-gray-50 text-sm text-gray-700">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap border-l-4 border-regal-yellow">
                        {/* ├ / └ ties the line to the product above */}
                        <span className="font-mono text-gray-400 mr-1">{lineIndex === (openLines[product.pro_id] || []).length - 1 ? '└' : '├'}</span>
                        {(currentPage - 1) * pageSize + index + 1}.{lineIndex + 1}
                      </td>
                      <td className="px-2 py-2">
                        <div>{product.pro_name}</div>
                        <span className="text-xs font-semibold text-regal-black">{line.label}</span>
                        {line.vendor_name && <span className="ml-1 text-xs text-gray-500">({line.vendor_name})</span>}
                        {line.status === 'CLOSED' && <span className="ml-1 text-xs text-gray-500">(closed)</span>}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{line.barcode || '-'}</td>
                      <td className="px-2 py-2 text-center">
                        {/* The cost as entered; freight / cartage / markup only go into the selling price */}
                        {line.cost.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold">{line.warehouse_stock}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                  </React.Fragment>
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

      <VendorBillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        batch={selectedBatch}
        bill={selectedBill}
        vendorId={formData.vendor_id}
        vendorName={vendors.find((v) => v.id === formData.vendor_id)?.name || ''}
        onSaved={replaceBatch}
      />
    </div>
  );
};

export default ShopWarehouseProductsPage;
