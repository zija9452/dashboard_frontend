'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import StockLineSearchTabs, { SearchLine } from '@/components/StockLineSearchTabs';

interface WarehouseAdjustItem {
  key: string; // product + line: a product can be in the list once per batch
  product_batch_id: string | null; // none = Old Stock
  batch_label: string | null; // shown only for a product with batches
  product_id: string;
  product_name: string;
  barcode: string;
  current_stock: number;
  action: 'increase' | 'decrease';
  quantity: number;
  reason: string;
}

const WarehouseAdjustStockPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [adjustItems, setAdjustItems] = useState<WarehouseAdjustItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Product line picked by barcode scan or name search: a product with batches comes as
  // "Old Stock" + one row per batch right in the list (a scanned batch barcode = its line)
  const addLine = (line: SearchLine) => {
    if (adjustItems.some(item => item.key === line.key)) {
      showToast('Already in list', 'warning');
      return;
    }
    const newItem: WarehouseAdjustItem = {
      key: line.key,
      product_batch_id: line.product_batch_id,
      batch_label: line.has_batches ? line.label : null,
      product_id: line.product_id,
      product_name: line.product_name,
      barcode: line.barcode || '',
      current_stock: line.stock,
      action: 'increase',
      quantity: 0,
      reason: 'Stock count adjustment',
    };
    setAdjustItems(prev => [...prev, newItem]);
    showToast(`Product added: ${line.product_name}${line.has_batches ? ` (${line.label})` : ''}`, 'success');
  };

  // Update item field
  const updateItem = (index: number, field: keyof WarehouseAdjustItem, value: any) => {
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
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of adjustItems) {
        try {
          const qty = item.action === 'decrease' ? -item.quantity : item.quantity;
          
          const response = await fetch('/api/warehouse-stock?action=adjust', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              product_id: item.product_id,
              product_type: 'warehouse',
              qty: qty,
              ref: item.reason,
              product_batch_id: item.product_batch_id,
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
            title: 'Adjustment Partially Failed',
            html: `
              <p>Successfully adjusted: ${successCount} product(s)</p>
              <p class="mt-2 text-red-600">Failed: ${errorCount} product(s)</p>
              <div class="mt-2 text-left text-sm">
                ${errors.map((e: string) => `<p class="mt-1">• ${e}</p>`).join('')}
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            title: 'Success!',
            text: `Stock adjusted for ${successCount} products.`,
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });

          // Reset
          setAdjustItems([]);
          router.push('/warehouse-stock');
        }
      } else if (errorCount > 0) {
        Swal.fire({
          title: 'Adjustment Failed',
          html: `
            <p>Failed to adjust stock for ${errorCount} product(s)</p>
            <div class="mt-2 text-left text-sm">
              ${errors.map((e: string) => `<p class="mt-1">• ${e}</p>`).join('')}
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'OK'
        });
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
      <PageHeader title="Warehouse Adjust Stock" />

      <div className="mb-4">
        <button onClick={() => router.push('/warehouse-stock')} title="Back" aria-label="Back"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Barcode scan / name search (warehouse products only) */}
      <StockLineSearchTabs onSelect={addLine} warehouse />

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
                  <tr key={item.key} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.product_name}</div>
                      {item.batch_label && <div className="text-xs text-gray-500">{item.batch_label}</div>}
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
                        value={item.quantity || ''}
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
              onClick={() => router.push('/warehouse-stock')}
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
          <p className="text-sm mt-2">Scan a barcode or search by name to add warehouse products</p>
        </div>
      )}

    </div>
  );
};

export default WarehouseAdjustStockPage;
