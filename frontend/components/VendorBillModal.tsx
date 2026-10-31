'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { BatchVendorBill, OpenBatch, batchNo } from '@/lib/batchLines';

// A vendor's bill in a batch (BATCH_COSTING_PLAN.md sec 11): bill total, freight, local
// cartage, markup % and bill pictures. Adding one puts the vendor in the batch; used on
// Warehouse Batches, Stock In and Add Product.

const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

// Local date (not UTC) so late-night entries keep today's date
const today = () => new Date().toLocaleDateString('en-CA');

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 10000) / 100 : 0);

async function errorOf(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error || data.detail || fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: OpenBatch | null;
  bill?: BatchVendorBill | null; // set = edit this bill
  vendorId: string; // the vendor being added (ignored when editing)
  vendorName: string;
  vendorPicker?: React.ReactNode; // Warehouse Batches: choose the vendor here
  batchPicker?: React.ReactNode; // Warehouse Batches "+ New Batch": choose the batch here (batch null until chosen)
  inline?: boolean; // on the page (like the Add Product form) instead of a pop-up
  onSaved: (batch: OpenBatch) => void;
}

export default function VendorBillModal({ isOpen, onClose, batch, bill, vendorId, vendorName, vendorPicker, batchPicker, inline, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ bill_date: today(), invoice_total: '', freight: '', cartage: '', markup_pct: '' });
  const [newImages, setNewImages] = useState<{ file: File; url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Fresh form on every open (edit: the bill's figures)
  useEffect(() => {
    if (!isOpen) return;
    setForm(bill
      ? { bill_date: bill.bill_date, invoice_total: String(bill.invoice_total), freight: String(bill.freight), cartage: String(bill.cartage), markup_pct: String(bill.markup_pct) }
      : { bill_date: today(), invoice_total: '', freight: '', cartage: '', markup_pct: '' });
    setNewImages((list) => {
      list.forEach((img) => URL.revokeObjectURL(img.url));
      return [];
    });
  }, [isOpen, bill?.id]);

  if ((!batch && !batchPicker) || (inline && !isOpen)) return null;

  const set = (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const total = Number(form.invoice_total) || 0;

  const pickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (!bill || !batch) {
      setNewImages((list) => [...list, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
      return;
    }
    // Saved bill: upload straight away
    const data = new FormData();
    files.forEach((f) => data.append('files', f, f.name));
    setSaving(true);
    try {
      const response = await fetch(`/api/warehouse-batches/${batch.id}/vendors/${bill.id}/images`, {
        method: 'POST',
        credentials: 'include',
        body: data,
      });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to upload pictures'));
      onSaved(await response.json());
      showToast('Pictures added', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to upload pictures', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSavedImage = async (imageId: string) => {
    const confirm = await Swal.fire({
      title: 'Delete this picture?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (!confirm.isConfirmed || !batch) return;
    try {
      const response = await fetch(`/api/warehouse-batches/${batch.id}/images/${imageId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to delete picture'));
      onSaved(await response.json());
    } catch (error: any) {
      showToast(error.message || 'Failed to delete picture', 'error');
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages((list) => {
      URL.revokeObjectURL(list[index].url);
      return list.filter((_, i) => i !== index);
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || bill) return; // a saved bill only changes its pictures
    if (!batch) {
      showToast('Select a batch', 'error');
      return;
    }
    if (!vendorId) {
      showToast('Select a vendor', 'error');
      return;
    }
    if (!(total > 0)) {
      showToast('Bill total must be more than 0', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('warehouse_vendor_id', vendorId);
      data.append('bill_date', form.bill_date);
      data.append('invoice_total', form.invoice_total);
      data.append('freight', form.freight || '0');
      data.append('cartage', form.cartage || '0');
      data.append('markup_pct', form.markup_pct || '0');
      newImages.forEach((img) => data.append('files', img.file, img.file.name));
      const response = await fetch(`/api/warehouse-batches/${batch.id}/vendors`, { method: 'POST', credentials: 'include', body: data });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to save the bill'));
      onSaved(await response.json());
      showToast(`${vendorName || 'Vendor'} added to ${batchNo(batch.batch_no)}`, 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to save the bill', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savedImages = bill?.images || [];
  // A saved bill's figures never change (prices / labels come from them): only its pictures
  const locked = !!bill;
  const title = batch ? `${batchNo(batch.batch_no)} – ${bill ? `${bill.vendor_name} bill pictures` : 'Add vendor bill'}` : 'Add vendor bill';

  const formBody = (
      <form onSubmit={save} className="space-y-4">
        {/* One grid: 3 in a line on the page (like the old batch form), 2 in the pop-up */}
        <div className={`grid grid-cols-1 gap-4 ${inline ? 'md:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {batchPicker && !bill && (
            <div>
              <label className="block text-sm font-medium mb-1">Batch *</label>
              {batchPicker}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Vendor *</label>
            {bill ? (
              <input value={bill.vendor_name} disabled className="regal-input w-full bg-gray-100" />
            ) : vendorPicker ? (
              vendorPicker
            ) : (
              <input value={vendorName} disabled className="regal-input w-full bg-gray-100" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input type="date" name="bill_date" value={form.bill_date} onChange={set} disabled={locked} className="regal-input w-full disabled:bg-gray-100 disabled:cursor-not-allowed" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bill total *</label>
            <input type="number" name="invoice_total" value={form.invoice_total} onChange={set} disabled={locked} className="regal-input w-full disabled:bg-gray-100 disabled:cursor-not-allowed" min="0.01" step="0.01" placeholder="0" required autoFocus={!inline} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Freight</label>
            <input type="number" name="freight" value={form.freight} onChange={set} disabled={locked} className="regal-input w-full disabled:bg-gray-100 disabled:cursor-not-allowed" min="0" step="0.01" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Local cartage</label>
            <input type="number" name="cartage" value={form.cartage} onChange={set} disabled={locked} className="regal-input w-full disabled:bg-gray-100 disabled:cursor-not-allowed" min="0" step="0.01" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Markup %</label>
            <input type="number" name="markup_pct" value={form.markup_pct} onChange={set} disabled={locked} className="regal-input w-full disabled:bg-gray-100 disabled:cursor-not-allowed" min="0" step="0.01" placeholder="0" />
          </div>
        </div>

        <div className="p-3 bg-gray-50 border rounded text-sm">
          Freight <b>{pct(Number(form.freight) || 0, total)}%</b> · Cartage <b>{pct(Number(form.cartage) || 0, total)}%</b> · Markup <b>{Number(form.markup_pct) || 0}%</b>
          {locked && <p className="text-xs text-gray-600 mt-1">A saved bill cannot change - only its pictures. Wrong figures: remove the bill (while no stock is in) and add it again.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bill pictures ({savedImages.length + newImages.length})</label>
          <div className="flex flex-wrap gap-3 items-center">
            {savedImages.map((img) => (
              <div key={img.id} className="relative">
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  <img src={img.url} alt="Bill" className="h-20 w-20 object-cover border rounded" />
                </a>
                <button type="button" onClick={() => deleteSavedImage(img.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 text-xs" title="Delete picture">
                  ✕
                </button>
              </div>
            ))}
            {newImages.map((img, i) => (
              <div key={img.url} className="relative">
                <img src={img.url} alt="Bill" className="h-20 w-20 object-cover border rounded" />
                <button type="button" onClick={() => removeNewImage(i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 text-xs" title="Remove picture">
                  ✕
                </button>
              </div>
            ))}
            <label className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
              + Add
              <input type="file" accept={IMAGE_TYPES} multiple onChange={pickImages} className="hidden" disabled={saving} />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!bill && (
            <button type="submit" disabled={saving} className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Bill'}
            </button>
          )}
          {/* The pop-up has its own Close at the bottom */}
          {inline && (
            <button type="button" onClick={onClose} className="regal-btn bg-gray-300 text-black">
              Close
            </button>
          )}
        </div>
      </form>
  );

  return inline ? (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {formBody}
    </div>
  ) : (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {formBody}
    </Modal>
  );
}
