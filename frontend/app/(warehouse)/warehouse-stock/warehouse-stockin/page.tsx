'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

interface WarehouseStockInItem {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  total_cost: number;
  date: string;
  vendor_id?: string;
  vendor_name?: string;
}

interface Product {
  pro_id: string;
  pro_name: string;
  pro_barcode: string;
  pro_price: number;
  pro_cost: number;
  stock: number;
  warehouse_stock: number;
  warehouse_cost?: number;
  is_warehouse_product: boolean;
}

interface WarehouseVendor {
  id: string;
  name: string;
  balance: number;
}

const WarehouseStockInPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // State
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendors, setVendors] = useState<WarehouseVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Temporary table for multi-product stock in
  const [stockInItems, setStockInItems] = useState<WarehouseStockInItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  // Focus barcode input on mount and fetch vendors
  useEffect(() => {
    barcodeInputRef.current?.focus();
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/warehouse-vendors/', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching warehouse vendors:', error);
      showToast('Failed to fetch warehouse vendors', 'error');
    }
  };

  // Handle barcode submit
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      showToast('Please enter a barcode', 'error');
      return;
    }

    if (searching) return;
    setSearching(true);

    try {
      const response = await fetch(`/api/products/searchbybarcode?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const product = await response.json();
        if (product && product.pro_id) {
          // Check if it's a warehouse product
          if (!product.is_warehouse_product) {
            const result = await Swal.fire({
              title: 'Not a Warehouse Product',
              text: 'This product is not marked as warehouse product. Do you want to update it?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes, Update',
              cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
              const updateResponse = await fetch(`/api/products/${product.pro_id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  is_warehouse_product: true
                })
              });

              if (updateResponse.ok) {
                product.is_warehouse_product = true;
              } else {
                showToast('Failed to update product', 'error');
                setSearching(false);
                return;
              }
            } else {
              setSearching(false);
              return;
            }
          }

          setSelectedProduct(product);
          setQuantity('');
          setCostPrice(product.warehouse_cost?.toString() || product.pro_cost?.toString() || '0');
          setSellingPrice(product.pro_price?.toString() || '0');
          showToast(`Product found: ${product.pro_name}`, 'success');

          setTimeout(() => {
            document.getElementById('quantity-input')?.focus();
          }, 100);
        } else {
          showToast('Product not found. Please add product first.', 'error');
          setSelectedProduct(null);
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error fetching product', 'error');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showToast('Error fetching product', 'error');
    } finally {
      setSearching(false);
      setBarcode('');
    }
  };

  // Add item to temporary table
  const handleAddItem = () => {
    if (!selectedProduct) {
      showToast('Please select a product first', 'error');
      return;
    }

    if (!selectedVendorId) {
      showToast('Please select a warehouse vendor', 'error');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    const qty = parseInt(quantity) || 0;
    const cost = parseFloat(costPrice) || 0;
    const vendor = vendors.find(v => v.id === selectedVendorId);

    const newItem: WarehouseStockInItem = {
      product_id: selectedProduct.pro_id,
      product_name: selectedProduct.pro_name,
      barcode: selectedProduct.pro_barcode,
      quantity: qty,
      cost_price: cost,
      selling_price: parseFloat(sellingPrice) || 0,
      total_cost: qty * cost,
      date: date,
      vendor_id: selectedVendorId,
      vendor_name: vendor?.name
    };

    setStockInItems([...stockInItems, newItem]);

    // Reset form
    setSelectedProduct(null);
    setBarcode('');
    setQuantity('');
    setCostPrice('0');
    setSellingPrice('0');
    // Note: We keep selectedVendorId for convenience if adding multiple items from same vendor

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);

    showToast('Item added to list', 'success');
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    const newItems = stockInItems.filter((_, i) => i !== index);
    setStockInItems(newItems);
  };

  // Handle stock in submission
  const handleStockIn = async () => {
    if (stockInItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of stockInItems) {
        try {
          const response = await fetch('/api/warehouse-stock?action=in', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              product_id: item.product_id,
              qty: item.quantity,
              vendor_id: item.vendor_id,
              cost_price: item.cost_price,
              ref: `W_IN_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            errors.push(`${item.product_name}: ${errorData.error || errorData.detail || 'Failed'}`);
            errorCount++;
          }
        } catch (error) {
          errors.push(`${item.product_name}: Network error`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        if (errorCount > 0) {
          Swal.fire({
            title: 'Stock In Partially Failed',
            html: `
              <p>Successfully added: ${successCount} product(s)</p>
              <p class="mt-2 text-red-600">Failed: ${errorCount} product(s)</p>
              <div class="mt-2 text-left text-sm">
                ${errors.map((e: string) => `<p class="mt-1">• ${e}</p>`).join('')}
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          
          // Remove failed items
          setStockInItems(prev => prev.slice(successCount));
        } else {
          Swal.fire({
            title: 'Success!',
            text: `Stock added for ${successCount} product(s).`,
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });

          setStockInItems([]);
          router.push('/warehouse-stock');
        }
      } else if (errorCount > 0) {
        Swal.fire({
          title: 'Stock In Failed',
          html: `
            <p>Failed to add stock for ${errorCount} product(s)</p>
            <div class="mt-2 text-left text-sm">
              ${errors.map((e: string) => `<p class="mt-1">• ${e}</p>`).join('')}
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (error: any) {
      let errorMessage = 'Failed to add stock';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Warehouse Stock In" />

      {/* Barcode Scanner Input */}
      <div className="regal-card mb-6">
        <h3 className="text-lg font-semibold mb-4">Scan Product Barcode</h3>
        <form onSubmit={handleBarcodeSubmit} className="flex gap-4">
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            className="regal-input flex-grow"
            autoFocus
          />
          <button
            type="submit"
            disabled={searching}
            className={`regal-btn flex items-center justify-center min-w-[130px] transition-all ${
              searching ? 'bg-regal-yellow/50 cursor-not-allowed text-regal-black/60' : 'bg-regal-yellow text-regal-black'
            }`}
          >
            {searching ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-regal-black/30 border-t-regal-black rounded-full animate-spin"></div>
                <span>Search</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>

      {/* Product Details Form */}
      {selectedProduct && (
        <div className="regal-card mb-6 !p-2 md:!p-6">
          <h3 className="text-lg font-semibold mb-4">Product Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <input
                type="text"
                value={selectedProduct.pro_name}
                disabled
                className="regal-input w-full bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current Warehouse Stock</label>
              <input
                type="text"
                value={selectedProduct.warehouse_stock || 0}
                disabled
                className="regal-input w-full bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Warehouse Vendor *</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="regal-input w-full"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input
                id="quantity-input"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="regal-input w-full"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Warehouse Cost (Rs.) *</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="regal-input w-full"
                step="1"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Rs.)</label>
              <input
                type="text"
                value={sellingPrice}
                disabled
                className="regal-input w-full bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="regal-input w-full"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddItem}
              className="regal-btn bg-regal-yellow text-regal-black"
            >
              + Add Item
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setBarcode('');
                setQuantity('');
                setCostPrice('0');
                setSellingPrice('0');
                barcodeInputRef.current?.focus();
              }}
              className="regal-btn bg-gray-300 text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Temporary Items Table */}
      {stockInItems.length > 0 && (
        <div className="regal-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Items to Stock In ({stockInItems.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Warehouse Cost</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockInItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">{item.product_name}</td>
                    <td className="px-4 py-3">{item.vendor_name || '-'}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{item.cost_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{item.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{stockInItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right">{stockInItems.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setStockInItems([]);
                setSelectedProduct(null);
                setBarcode('');
                setQuantity('');
                barcodeInputRef.current?.focus();
              }}
              className="regal-btn bg-gray-300 text-black"
            >
              Clear All
            </button>
            <button
              onClick={handleStockIn}
              className="regal-btn bg-regal-yellow text-regal-black"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Stock In All'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseStockInPage;
