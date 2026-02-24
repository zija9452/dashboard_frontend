'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

interface Product {
  pro_id: string;
  pro_name: string;
  pro_barcode: string;
  pro_price: number;
  stock: number;
}

interface AdjustItem {
  product_id: string;
  product_name: string;
  barcode: string;
  current_stock: number;
  action: 'increase' | 'decrease';
  quantity: number;  // Number (default 0)
  reason: string;
}

const AdjustStockPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [barcode, setBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustItems, setAdjustItems] = useState<AdjustItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Search products by barcode
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      showToast('Please enter a barcode', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/products/searchbybarcode?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const product = await response.json();
        if (product && product.pro_id) {
          // Check if product already in list
          const exists = adjustItems.find(item => item.product_id === product.pro_id);
          if (exists) {
            showToast('Product already in list', 'warning');
          } else {
            const newItem: AdjustItem = {
              product_id: product.pro_id,
              product_name: product.pro_name,
              barcode: product.pro_barcode,
              current_stock: product.stock || 0,
              action: 'increase',
              quantity: 0,  // Default 0 like products page
              reason: 'Stock count adjustment',
            };
            setAdjustItems([...adjustItems, newItem]);
            showToast(`Product added: ${product.pro_name}`, 'success');
          }
        } else {
          showToast('Product not found', 'error');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error fetching product', 'error');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showToast('Error fetching product', 'error');
    }

    setBarcode('');
    barcodeInputRef.current?.focus();
  };

  // Update item field
  const updateItem = (index: number, field: keyof AdjustItem, value: any) => {
    const newItems = [...adjustItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setAdjustItems(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    const newItems = adjustItems.filter((_, i) => i !== index);
    setAdjustItems(newItems);
  };

  // Submit adjustments
  const handleSubmit = async () => {
    if (adjustItems.length === 0) {
      showToast('Please add at least one product', 'error');
      return;
    }

    // Validate all items
    for (const item of adjustItems) {
      if (item.quantity <= 0) {
        showToast(`Please enter quantity for ${item.product_name}`, 'error');
        return;
      }
      if (item.action === 'decrease' && item.quantity > item.current_stock) {
        showToast(`Cannot decrease more than current stock for ${item.product_name}`, 'error');
        return;
      }
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = adjustItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,  // Already number
        action: item.action,
        reason: item.reason,
      }));

      const response = await fetch('/api/stock/adjuststock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        Swal.fire({
          title: 'Success!',
          text: `Stock adjusted for ${result.results?.length || 0} products.`,
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        // Reset
        setAdjustItems([]);
        router.push('/stock');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to adjust stock', 'error');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      showToast('Error adjusting stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Adjust Stock" />

      {/* Barcode Scanner Input */}
      <div className="regal-card mb-6">
        <h3 className="text-lg font-semibold mb-4">Search Product by Barcode</h3>
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
            className="regal-btn bg-regal-yellow text-regal-black"
          >
            Search
          </button>
        </form>
      </div>

      {/* Adjustment Items Table */}
      {adjustItems.length > 0 && (
        <div className="regal-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Products to Adjust ({adjustItems.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-center">Action</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adjustItems.map((item, index) => (
                  <tr key={item.product_id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.product_name}</div>
                    </td>
                    <td className="px-4 py-3">{item.barcode || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{item.current_stock}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={item.action}
                        onChange={(e) => updateItem(index, 'action', e.target.value as 'increase' | 'decrease')}
                        className="regal-input text-center"
                        style={{ minWidth: '120px' }}
                      >
                        <option value="increase">Increase (+)</option>
                        <option value="decrease">Decrease (-)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={item.quantity || ''}  // Show empty if 0
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 0)}
                        className="regal-input text-right"
                        min="1"
                        style={{ width: '80px' }}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.reason}
                        onChange={(e) => updateItem(index, 'reason', e.target.value)}
                        className="regal-input"
                        placeholder="Reason..."
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || adjustItems.length === 0}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Submit Adjustments'}
            </button>
            <button
              onClick={() => setAdjustItems([])}
              className="regal-btn bg-gray-300 text-black"
            >
              Clear All
            </button>
            <button
              onClick={() => router.push('/stock')}
              className="regal-btn bg-gray-300 text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {adjustItems.length === 0 && (
        <div className="regal-card text-center py-12 text-gray-500">
          <p className="text-lg">No products added yet</p>
          <p className="text-sm mt-2">Search for products by barcode to adjust their stock</p>
        </div>
      )}
    </div>
  );
};

export default AdjustStockPage;
