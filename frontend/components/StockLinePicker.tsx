'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

// One stock line of a product: Old Stock (product_batch_id null) or a batch with its own
// barcode / price / stock - from /api/stock/batches/{id} (shop) or
// /api/warehouse-batches/product/{id} (warehouse).
export interface StockLine {
  product_batch_id: string | null;
  label: string; // "Old Stock" / "Batch 003" / "Shop Batch 001"
  barcode: string | null;
  vendor_name: string | null;
  cost: number;
  selling_price: number;
  stock: number;
}

/** The product's lines in this place (shop or warehouse); Old Stock is always offered. */
export async function fetchStockLines(productId: string, product: { barcode: string; cost: number; price: number },
                                      warehouse: boolean): Promise<StockLine[]> {
  const url = warehouse ? `/api/warehouse-batches/product/${productId}` : `/api/stock/batches/${productId}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load batches');
  const data = await response.json();
  const lines: StockLine[] = (data.lines || []).map((l: any) => ({
    product_batch_id: l.product_batch_id ?? null,
    label: l.label,
    barcode: l.barcode,
    vendor_name: l.vendor_name,
    cost: Number(l.cost) || 0,
    selling_price: Number(l.selling_price) || 0,
    stock: Number(warehouse ? l.warehouse_stock : l.stock) || 0,
  }));
  // Old Stock is listed only while it is not 0 - an increase can still go into it
  if (!lines.some((l) => l.product_batch_id === null)) {
    lines.unshift({ product_batch_id: null, label: 'Old Stock', barcode: product.barcode, vendor_name: null,
                    cost: product.cost, selling_price: product.price, stock: 0 });
  }
  return lines;
}

/** "Which stock?" pop-up for a product with batches (Adjust / Transfer). */
const StockLinePicker: React.FC<{
  productName: string;
  lines: StockLine[] | null; // null = closed
  onPick: (line: StockLine) => void;
  onClose: () => void;
}> = ({ productName, lines, onPick, onClose }) => (
  <Modal isOpen={!!lines} onClose={onClose} title="Choose stock">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
            <th className="px-3 py-3 text-left">Product</th>
            <th className="px-3 py-3 text-left">Batch</th>
            <th className="px-3 py-3 text-left">Barcode</th>
            <th className="px-3 py-3 text-center">Price</th>
            <th className="px-3 py-3 text-center">Stock</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(lines || []).map((line) => (
            <tr key={line.product_batch_id || 'old'} onClick={() => onPick(line)} className="hover:bg-yellow-50 text-sm cursor-pointer">
              <td className="px-3 py-3 font-medium">{productName}</td>
              <td className="px-3 py-3">
                <div className="font-medium">{line.label}</div>
                {line.vendor_name && <div className="text-xs text-gray-500">{line.vendor_name}</div>}
              </td>
              <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{line.barcode || '-'}</td>
              <td className="px-3 py-3 text-center whitespace-nowrap">{line.selling_price.toLocaleString()}</td>
              <td className="px-3 py-3 text-center font-semibold">{line.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Modal>
);

export default StockLinePicker;
