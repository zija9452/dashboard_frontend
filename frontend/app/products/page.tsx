'use client';

'use client';

import React, { useState, useEffect } from 'react';
import { Product, productsApi } from '@/lib/api/products';
import Pagination from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { FormField, Form } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';

// Define props for the page component
interface ProductsPageProps {
  searchParams?: {
    page?: string;
    limit?: string;
    search?: string;
  };
}

const ProductsPage: React.FC<ProductsPageProps> = ({ searchParams }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'>>({
    sku: '',
    name: '',
    desc: '',
    unit_price: 0,
    cost_price: 0,
    tax_rate: 0,
    vendor_id: '',
    stock_level: 0,
    attributes: '',
    barcode: '',
    discount: 0,
    category: '',
    branch: '',
    limited_qty: false,
    brand_action: ''
  });

  const { showToast } = useToast();

  // Calculate totalPages based on totalItems and pageSize
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch products when page, pageSize, or searchTerm changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Parse page and limit from search params if available
        const pageParam = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
        const limitParam = searchParams?.limit ? parseInt(searchParams.limit, 10) : DEFAULT_PAGE_SIZE;

        // Update state based on URL params
        setCurrentPage(pageParam);
        setPageSize(limitParam);
        if (searchParams?.search) {
          setSearchTerm(searchParams.search);
        }

        // Fetch products from API
        const response = await productsApi.getProducts(pageParam, limitParam, searchTerm);
        setProducts(response.data);
        setTotalItems(response.total || response.data.length); // Use response.total if available
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, pageSize, searchTerm, searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        // Update existing product
        await productsApi.updateProduct(editingProduct.id, formData);
        showToast('Product updated successfully', 'success');
      } else {
        // Create new product
        await productsApi.createProduct(formData);
        showToast('Product created successfully', 'success');
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        desc: '',
        unit_price: 0,
        cost_price: 0,
        tax_rate: 0,
        vendor_id: '',
        stock_level: 0,
        attributes: '',
        barcode: '',
        discount: 0,
        category: '',
        branch: '',
        limited_qty: false,
        brand_action: ''
      });

      // Refresh products
      const response = await productsApi.getProducts(currentPage, pageSize, searchTerm);
      setProducts(response.data);
      setTotalItems(response.total || response.data.length);
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Failed to save product', 'error');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      desc: product.desc || '',
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      tax_rate: product.tax_rate || 0,
      vendor_id: product.vendor_id,
      stock_level: product.stock_level,
      attributes: product.attributes || '',
      barcode: product.barcode || '',
      discount: product.discount || 0,
      category: product.category || '',
      branch: product.branch || '',
      limited_qty: product.limited_qty || false,
      brand_action: product.brand_action || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsApi.deleteProduct(id);
        showToast('Product deleted successfully', 'success');

        // Refresh products
        const response = await productsApi.getProducts(currentPage, pageSize, searchTerm);
        setProducts(response.data);
        setTotalItems(response.total || response.data.length);
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
      }
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      desc: '',
      unit_price: 0,
      cost_price: 0,
      tax_rate: 0,
      vendor_id: '',
      stock_level: 0,
      attributes: '',
      barcode: '',
      discount: 0,
      category: '',
      branch: '',
      limited_qty: false,
      brand_action: ''
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
    { key: 'sku', title: 'SKU' },
    { key: 'name', title: 'Name' },
    { key: 'unit_price', title: 'Price', render: (value: number) => `₹${value.toFixed(2)}` },
    { key: 'stock_level', title: 'Stock' },
    { key: 'category', title: 'Category' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={openCreateModal}>Add Product</Button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
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
          data={products}
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
          baseUrl="/products"
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found.</p>
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

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create Product'}
      >
        <Form onSubmit={handleSubmit}>
          <FormField
            label="SKU"
            id="sku"
            name="sku"
            type="text"
            value={formData.sku}
            onChange={handleInputChange}
            required
          />

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
            label="Description"
            id="desc"
            name="desc"
            type="text"
            value={formData.desc}
            onChange={handleInputChange}
            textarea
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Unit Price"
              id="unit_price"
              name="unit_price"
              type="number"
              value={formData.unit_price}
              onChange={handleInputChange}
              required
            />

            <FormField
              label="Cost Price"
              id="cost_price"
              name="cost_price"
              type="number"
              value={formData.cost_price}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Tax Rate (%)"
              id="tax_rate"
              name="tax_rate"
              type="number"
              value={formData.tax_rate}
              onChange={handleInputChange}
            />

            <FormField
              label="Stock Level"
              id="stock_level"
              name="stock_level"
              type="number"
              value={formData.stock_level}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Vendor ID"
              id="vendor_id"
              name="vendor_id"
              type="text"
              value={formData.vendor_id}
              onChange={handleInputChange}
              required
            />

            <FormField
              label="Category"
              id="category"
              name="category"
              type="text"
              value={formData.category}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Barcode"
              id="barcode"
              name="barcode"
              type="text"
              value={formData.barcode}
              onChange={handleInputChange}
            />

            <FormField
              label="Discount (%)"
              id="discount"
              name="discount"
              type="number"
              value={formData.discount}
              onChange={handleInputChange}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsPage;