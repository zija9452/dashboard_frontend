// Shop batches (LH / KA), BATCH_COSTING_PLAN.md sec 12: "Shop Batch 001" with shop vendors
// inside, no bill. One count for every shop; made in one shop, copied to the other.

export interface ShopBatchVendor {
  id: string; // batch vendor id
  vendor_id: string;
  vendor_name: string;
  vendor_code: string | null;
  line_count: number;
  locked: boolean; // stock went in: can't be removed
}

export interface ShopBatch {
  id: string;
  batch_no: number;
  label: string; // "Shop Batch 001"
  batch_date: string;
  status: 'OPEN' | 'CLOSED';
  note: string | null;
  vendors: ShopBatchVendor[];
  vendor_count: number;
  line_count: number;
  created_by_name: string | null;
  created_at: string;
  closed_by_name: string | null;
  closed_at: string | null;
  branch_warnings?: string[];
}

export const shopBatchOption = (b: ShopBatch) => `${b.label}${b.note ? ` · ${b.note}` : ''}`;

export const shopVendorOf = (batch: ShopBatch | null, vendorId: string) =>
  batch?.vendors.find((v) => v.vendor_id === vendorId) || null;

async function json(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || 'Request failed');
  return data;
}

export async function fetchShopBatches(status?: 'OPEN' | 'CLOSED'): Promise<ShopBatch[]> {
  const params = new URLSearchParams({ limit: '200' });
  if (status) params.set('status_filter', status);
  const data = await json(await fetch(`/api/shop-batches?${params.toString()}`, { credentials: 'include' }));
  return data.data || [];
}

export async function shopBatchCall(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<any> {
  return json(await fetch(`/api/shop-batches${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }));
}
