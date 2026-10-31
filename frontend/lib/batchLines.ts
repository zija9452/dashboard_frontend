import { useState } from 'react';

// One warehouse stock line of a product: "Old Stock" (not in any batch) or a vendor batch
export interface BatchLine {
  label: string;
  barcode: string | null;
  vendor_name: string | null;
  batch_date: string | null;
  cost: number;
  landed_cost: number | null;
  selling_price: number;
  warehouse_stock: number;
  status: 'OPEN' | 'CLOSED' | null;
}

// One shop stock line of a product in this branch: "Old Stock" or a batch (shop cost / price / stock)
export interface ShopBatchLine {
  label: string;
  barcode: string | null;
  vendor_name: string | null;
  cost: number;
  selling_price: number;
  stock: number;
}

const warehouseLinesUrl = (productId: string) => `/api/warehouse-batches/product/${productId}`;
export const shopLinesUrl = (productId: string) => `/api/stock/batches/${productId}`;

/**
 * Open / close a product's batch lines in a list (Warehouse Stock, Warehouse Products;
 * shop Stock / Products with shopLinesUrl). lines[id] is null while loading; an id not in
 * lines is closed.
 */
export function useBatchLines<T = BatchLine>(
  onError: (message: string) => void,
  linesUrl: (productId: string) => string = warehouseLinesUrl,
) {
  const [lines, setLines] = useState<Record<string, T[] | null>>({});

  const close = (productId: string) => setLines(({ [productId]: _, ...rest }) => rest);

  const toggle = async (productId: string) => {
    if (productId in lines) {
      close(productId);
      return;
    }
    setLines((prev) => ({ ...prev, [productId]: null }));
    try {
      const response = await fetch(linesUrl(productId), { credentials: 'include' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setLines((prev) => (productId in prev ? { ...prev, [productId]: data.lines || [] } : prev));
    } catch {
      close(productId);
      onError('Failed to load batches');
    }
  };

  return { lines, toggle };
}

// What a selling price is worked out from: a vendor's bill in a batch
export interface BillCosting {
  invoice_total: number;
  freight: number;
  cartage: number;
  markup_pct: number;
}

// One vendor's bill inside a batch (its goods of that lot)
export interface BatchVendorBill extends BillCosting {
  id: string;
  warehouse_vendor_id: string;
  vendor_name: string;
  vendor_code: string | null;
  bill_date: string; // day this vendor's goods of the lot arrived
  freight_pct: number;
  cartage_pct: number;
  stocked_total: number; // bill amount stocked in so far
  locked: boolean; // stock went in: bill total / freight / cartage / markup can't change, can't be removed
  images: { id: string; url: string }[];
}

// A batch = one lot reaching the warehouse, with the vendors whose goods came in it
// (Warehouse Batches page; picked at Stock In / Add Product while OPEN)
export interface OpenBatch {
  id: string;
  batch_no: number;
  batch_date: string;
  note: string | null;
  status: 'OPEN' | 'CLOSED';
  vendors: BatchVendorBill[];
}

export const batchNo = (n: number) => `Batch ${String(n).padStart(3, '0')}`;

/** "Batch 003" (+ " · note") for batch dropdowns - the date is on the batch's side panel */
export const batchOption = (b: OpenBatch) => `${batchNo(b.batch_no)}${b.note ? ` · ${b.note}` : ''}`;

/** The vendor's bill in the batch, or null while the vendor is not added to it yet */
export const billOf = (batch: OpenBatch | null, vendorId: string) =>
  batch?.vendors.find((v) => v.warehouse_vendor_id === vendorId) || null;

/** 1210, 500.5 - paisa only when there are any, no thousands comma (shop lists) */
export const plainAmount = (n: number) => String(Math.round(n * 100) / 100);

/** Product row of a product with batches: "1,000 – 2,000" (lowest – highest over its lines),
 * one value when all lines are the same. */
export const rangeText = ([low, high]: [number, number], format: (n: number) => string = (n) => n.toLocaleString()) =>
  low === high ? format(low) : `${format(low)} – ${format(high)}`;

// Same as the backend (utils/batch_barcode.py): cost + freight % + cartage % of the
// vendor's bill, plus markup % of the cost only (not of freight / cartage), rounded up to 10
// (to paisa first, so 70.004 stays 70)
export const batchPrices = (cost: number, b: BillCosting) => {
  const freightPct = b.invoice_total > 0 ? (b.freight / b.invoice_total) * 100 : 0;
  const cartagePct = b.invoice_total > 0 ? (b.cartage / b.invoice_total) * 100 : 0;
  const freight = cost * freightPct / 100;
  const cartage = cost * cartagePct / 100;
  const landed = cost + freight + cartage;
  const markup = cost * b.markup_pct / 100;
  const withMarkup = Math.round((landed + markup) * 100) / 100;
  const paisa = (n: number) => Math.round(n * 100) / 100;
  return {
    freightPct: paisa(freightPct),
    cartagePct: paisa(cartagePct),
    freight: paisa(freight),
    cartage: paisa(cartage),
    landed: paisa(landed),
    markup: paisa(markup),
    selling: Math.ceil(withMarkup / 10) * 10,
  };
};

// Short: "1,000 + F 8% + C 3% + M 10% = Rs. 1,210"; full (with amounts) as the hover title
export const batchPriceBreakdown = (cost: number, b: BillCosting) => {
  const p = batchPrices(cost, b);
  const rs = (n: number) => `Rs. ${n.toLocaleString()}`;
  return {
    short: `${cost.toLocaleString()} + F ${p.freightPct}% + C ${p.cartagePct}% + M ${b.markup_pct}% = ${rs(p.selling)}`,
    full: `Cost ${rs(cost)} + Freight ${p.freightPct}% (${rs(p.freight)}) + Cartage ${p.cartagePct}% (${rs(p.cartage)})`
      + ` + Markup ${b.markup_pct}% (${rs(p.markup)}) = ${rs(p.selling)}`,
  };
};

/** All open batches with their vendors' bills, newest first - loaded once by the page. */
export async function fetchOpenBatches(): Promise<OpenBatch[]> {
  const params = new URLSearchParams({ status_filter: 'OPEN', limit: '200', brief: 'true' });
  const response = await fetch(`/api/warehouse-batches?${params.toString()}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load open batches');
  const data = await response.json();
  return data.data || [];
}
