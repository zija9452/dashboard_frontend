'use client';

import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Modal from '@/components/ui/Modal';
import VendorBillModal from '@/components/VendorBillModal';
import { useBranch } from '@/lib/branch';
import { BatchVendorBill, OpenBatch, batchNo, batchOption, fetchOpenBatches } from '@/lib/batchLines';

// A batch = one lot (laat) reaching the warehouse (BATCH_COSTING_PLAN.md sec 11): Batch 001,
// 002 ... for the whole warehouse, with the vendors whose goods came in it, each with its
// own bill. OPEN = goods still arriving, CLOSED = locked.

interface Batch extends OpenBatch {
  label: string; // "Batch 003"
  vendor_count: number;
  invoice_total: number; // all vendors' bills
  stocked_total: number;
  created_by_name: string | null;
  created_at: string;
  closed_by_name: string | null;
  closed_at: string | null;
}

// "Vendor Bills" tab: one vendor's bill in one batch
interface VendorBillRow extends BatchVendorBill {
  batch_id: string;
  batch_no: number;
  batch_status: 'OPEN' | 'CLOSED';
}

interface Vendor {
  ven_id: string;
  ven_name: string;
  vendor_code: string | null;
}

const PAGE_SIZE = 20;

// Local date (not UTC) so late-night entries keep today's date
const today = () => new Date().toLocaleDateString('en-CA');

const emptyForm = () => ({ batch_date: today(), note: '' });

const money = (n: number) => n.toLocaleString('en-PK', { maximumFractionDigits: 2 });
const showDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB');

/** Stocked so far against the bill: green, red once over the bill */
function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-200 mt-1 overflow-hidden">
      <div className={`h-full rounded-full ${done > total ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const vendorLabel = (v: Vendor) => `${v.ven_name.trim()}${v.vendor_code ? ` (${v.vendor_code})` : ''}`;

async function errorOf(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error || data.detail || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Vendor picker like the Production Status app: the field is the search box, the list
 * opens below with "+ Create vendor" on top, which opens the full vendor form (the
 * typed text becomes its name).
 */
function VendorPicker({ value, vendors, disabled, onChange, onCreate }: {
  value: string;
  vendors: Vendor[];
  disabled?: boolean;
  onChange: (id: string) => void;
  onCreate: (typedName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  });

  const chosen = vendors.find((v) => v.ven_id === value);
  const term = q.trim().toLowerCase();
  const shown = vendors.filter((v) => vendorLabel(v).toLowerCase().includes(term));

  function close() {
    setOpen(false);
    setQ('');
    setAt(-1);
  }

  const pick = (id: string) => {
    onChange(id);
    close();
  };

  const create = () => {
    onCreate(q.trim());
    close();
  };

  return (
    <div ref={box} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        required={!chosen}
        value={open ? q : chosen ? vendorLabel(chosen) : ''}
        placeholder={open && chosen ? vendorLabel(chosen) : 'Search or create vendor'}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setAt(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setAt(Math.min(at + 1, shown.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAt(Math.max(at - 1, -1));
          }
          if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (at >= 0 && shown[at]) pick(shown[at].ven_id);
            else if (shown.length === 1 && term) pick(shown[0].ven_id);
            else create();
          }
        }}
        className="regal-input w-full pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-gray-500">
        ▼
      </span>
      {open && (
        <div role="listbox" className="absolute top-[calc(100%+2px)] left-0 right-0 z-40 max-h-72 overflow-auto bg-white border rounded-lg shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={create}
            className="w-full text-left px-4 py-3 border-b font-medium text-regal-black bg-yellow-200 hover:bg-yellow-100"
          >
            + Create vendor
          </button>
          {shown.map((v, i) => (
            <button
              key={v.ven_id}
              type="button"
              role="option"
              aria-selected={v.ven_id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(v.ven_id)}
              onMouseEnter={() => setAt(i)}
              className={`w-full flex justify-between items-center px-4 py-2.5 text-left text-sm ${i === at ? 'bg-gray-200' : ''}`}
            >
              <span className="truncate">{vendorLabel(v)}</span>
              {v.ven_id === value && <span className="text-green-600">✓</span>}
            </button>
          ))}
          {!shown.length && (
            <div className="px-4 py-2 text-sm text-gray-500">{term ? 'No match. Use Create above.' : 'No vendors yet. Use Create above.'}</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Batch picker like the vendor picker: the field is the search box (batch no / date / note),
 * the list opens below with "+ Create batch" on top, which opens a small pop-up for the
 * lot's date + note and makes the next Batch number.
 */
function BatchPicker({ value, batches, onChange, onCreated }: {
  value: string;
  batches: Batch[];
  onChange: (id: string) => void;
  onCreated: (batch: Batch) => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const [newForm, setNewForm] = useState<ReturnType<typeof emptyForm> | null>(null); // null = pop-up closed
  const [creating, setCreating] = useState(false);
  const [nextNo, setNextNo] = useState<number | null>(null); // number the new batch will get

  // Asked ahead (when the form opens, and after each create) so the pop-up shows it at once
  const loadNextNo = () =>
    fetch('/api/warehouse-batches/next-number', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setNextNo(data?.batch_no ?? null))
      .catch(() => setNextNo(null));

  useEffect(() => {
    loadNextNo();
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  });

  const chosen = batches.find((b) => b.id === value);
  const term = q.trim().toLowerCase();
  const shown = batches.filter((b) => batchOption(b).toLowerCase().includes(term));

  function close() {
    setOpen(false);
    setQ('');
    setAt(-1);
  }

  const pick = (id: string) => {
    onChange(id);
    close();
  };

  // Date = today unless changed (not shown in the batch dropdowns); each vendor's bill has its own date
  const startCreate = () => {
    setNewForm({ ...emptyForm(), note: q.trim() });
    close();
    loadNextNo(); // refresh in the background (someone else may have made one)
  };

  // Not a <form>: this sits inside the bill form, whose Save must not fire
  const create = async () => {
    if (!newForm || creating) return;
    setCreating(true);
    try {
      const response = await fetch('/api/warehouse-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newForm),
      });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to create batch'));
      const batch: Batch = await response.json();
      setNewForm(null);
      onCreated(batch);
      setNextNo(batch.batch_no + 1);
      showToast(`${batch.label} created`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to create batch', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={box} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        value={open ? q : chosen ? batchOption(chosen) : ''}
        placeholder={open && chosen ? batchOption(chosen) : 'Search or create batch'}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setAt(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setAt(Math.min(at + 1, shown.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAt(Math.max(at - 1, -1));
          }
          if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (at >= 0 && shown[at]) pick(shown[at].id);
            else if (shown.length === 1 && term) pick(shown[0].id);
            else startCreate();
          }
        }}
        className="regal-input w-full pr-8"
      />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-gray-500">
        ▼
      </span>
      {open && (
        <div role="listbox" className="absolute top-[calc(100%+2px)] left-0 right-0 z-40 max-h-72 overflow-auto bg-white border rounded-lg shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={startCreate}
            className="w-full text-left px-4 py-3 border-b font-medium text-regal-black bg-yellow-200 hover:bg-yellow-100"
          >
            + Create batch
          </button>
          {shown.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={b.id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(b.id)}
              onMouseEnter={() => setAt(i)}
              className={`w-full flex justify-between items-center px-4 py-2.5 text-left text-sm ${i === at ? 'bg-gray-200' : ''}`}
            >
              <span className="truncate">{batchOption(b)}</span>
              {b.id === value && <span className="text-green-600">✓</span>}
            </button>
          ))}
          {!shown.length && (
            <div className="px-4 py-2 text-sm text-gray-500">{term ? 'No match. Use Create above.' : 'No open batch yet. Use Create above.'}</div>
          )}
        </div>
      )}

      <Modal isOpen={!!newForm} onClose={() => setNewForm(null)} title="Create Batch">
        {newForm && (
          <div
            className="space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                create();
              }
            }}
          >
            {/* Given automatically - shown, not editable */}
            <div>
              <label className="block text-sm font-medium mb-1">Batch No</label>
              <input value={nextNo ? batchNo(nextNo) : '...'} readOnly tabIndex={-1} className="regal-input w-full bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                value={newForm.batch_date}
                onChange={(e) => setNewForm({ ...newForm, batch_date: e.target.value })}
                className="regal-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input
                type="text"
                value={newForm.note}
                onChange={(e) => setNewForm({ ...newForm, note: e.target.value })}
                className="regal-input w-full"
                maxLength={500}
                placeholder="Optional - e.g. truck"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={create} disabled={creating || !newForm.batch_date} className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
                {creating ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const WarehouseBatchesPage: React.FC = () => {
  const { showToast } = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  // Batches = one row per lot; Vendor Bills = one row per vendor's bill (a vendor's lots together)
  const [tab, setTab] = useState<'batches' | 'bills'>('batches');
  const [bills, setBills] = useState<VendorBillRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // New / edit batch: only its date and note (vendors are added inside it)
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState(emptyForm());
  // Right-side details panel
  const [viewing, setViewing] = useState<Batch | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // A vendor's bill in the viewed batch: add (bill null) or edit
  const [billOpen, setBillOpen] = useState(false);
  const [billEditing, setBillEditing] = useState<BatchVendorBill | null>(null);
  const [billVendorId, setBillVendorId] = useState('');
  // "+ Vendor Bill" at the top: the batch is chosen in the pop-up (open batches only)
  const [billFromTop, setBillFromTop] = useState(false);
  const [openBatches, setOpenBatches] = useState<Batch[]>([]);
  const [billBatchId, setBillBatchId] = useState('');

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/warehouse-vendors/viewvendor?page=1&limit=1000', { credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to load vendors'));
      const data = await response.json();
      setVendors(data.data || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load vendors', 'error');
    }
  };

  // "+ Create vendor" in the picker: the same form as the Warehouse Vendors page, in a pop-up
  const emptyVendorForm = { name: '', phone: '', address: '', branch: 'Warehouse Main' };
  const [vendorForm, setVendorForm] = useState<typeof emptyVendorForm | null>(null); // null = closed
  const [savingVendor, setSavingVendor] = useState(false);
  const currentBranch = useBranch();
  const branchOptions = [...(currentBranch ? [currentBranch.name] : []), 'Warehouse Main'];

  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm || savingVendor) return;
    setSavingVendor(true);
    try {
      const response = await fetch('/api/warehouse-vendors/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: vendorForm.name,
          contacts: JSON.stringify({ phone: vendorForm.phone, email: '', address: vendorForm.address }),
          branch: vendorForm.branch,
        }),
      });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to create vendor'));
      const created = await response.json();
      const vendor: Vendor = { ven_id: created.id, ven_name: created.name, vendor_code: created.vendor_code };
      setVendors((list) => [...list, vendor]);
      setBillVendorId(vendor.ven_id);
      setVendorForm(null);
      setBillOpen(true); // a click in this pop-up closed the bill pop-up behind it
      showToast(`Vendor ${vendorLabel(vendor)} created`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to create vendor', 'error');
    } finally {
      setSavingVendor(false);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
      if (vendorFilter) params.append('vendor_id', vendorFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      const url = tab === 'bills' ? '/api/warehouse-batches/bills' : '/api/warehouse-batches';
      const response = await fetch(`${url}?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to load batches'));
      const data = await response.json();
      if (tab === 'bills') setBills(data.data || []);
      else setBatches(data.data || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error: any) {
      showToast(error.message || 'Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [currentPage, vendorFilter, statusFilter, searchTerm, tab]);

  // A vendor bill row opens its batch's side panel
  const openBillBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/warehouse-batches/${batchId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to load batch'));
      openDetails(await response.json());
    } catch (error: any) {
      showToast(error.message || 'Failed to load batch', 'error');
    }
  };

  const closeForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (batch: Batch) => {
    setEditing(batch);
    setForm({ batch_date: batch.batch_date, note: batch.note || '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetails = (batch: Batch) => {
    setViewing(batch);
    setPanelOpen(true);
  };

  const closeDetails = () => {
    setPanelOpen(false);
    // Unmount after the slide-out, or the invisible overlay keeps blocking clicks
    setTimeout(() => setViewing(null), 300);
  };

  const replaceBatch = (updated: Batch) => {
    setBatches((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    if (tab === 'bills') fetchBatches(); // its bill rows changed
    if (editing?.id === updated.id) setEditing(updated);
    if (viewing?.id === updated.id) setViewing(updated);
    if (billEditing) setBillEditing(updated.vendors.find((v) => v.id === billEditing.id) || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(editing ? `/api/warehouse-batches/${editing.id}` : '/api/warehouse-batches', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batch_date: form.batch_date, note: form.note }),
      });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to save batch'));
      const saved: Batch = await response.json();
      Swal.fire({
        title: editing ? 'Updated!' : 'Created!',
        text: editing ? saved.label : `${saved.label} - add vendors' bills as their goods arrive`,
        icon: 'success',
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      closeForm();
      await fetchBatches();
      if (!editing) openDetails(saved);
    } catch (error: any) {
      showToast(error.message || 'Failed to save batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (batch: Batch) => {
    const confirm = await Swal.fire({
      title: `Close ${batch.label}?`,
      text: 'All goods of this lot have arrived. A closed batch cannot be edited and will not show at Stock In.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Close batch',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(batch.id);
    try {
      const response = await fetch(`/api/warehouse-batches/${batch.id}/close`, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to close batch'));
      replaceBatch(await response.json());
      if (editing?.id === batch.id) closeForm();
      showToast(`${batch.label} closed`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to close batch', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (batch: Batch) => {
    const confirm = await Swal.fire({
      title: `Delete ${batch.label}?`,
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(batch.id);
    try {
      const response = await fetch(`/api/warehouse-batches/${batch.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to delete batch'));
      if (editing?.id === batch.id) closeForm();
      if (viewing?.id === batch.id) closeDetails();
      showToast(`${batch.label} deleted`, 'success');
      await fetchBatches();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete batch', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openAddBill = () => {
    setBillFromTop(false);
    setBillEditing(null);
    setBillVendorId('');
    setBillOpen(true);
  };

  // "+ New Batch": one form - choose (or create) the batch, then the vendor and its bill
  const [openingBill, setOpeningBill] = useState(false); // loading the open batches for the form
  const openTopBill = async () => {
    if (openingBill) return;
    setOpeningBill(true);
    try {
      const open = (await fetchOpenBatches()) as Batch[];
      setOpenBatches(open);
      setBillBatchId(open[0]?.id || ''); // newest; none open = create one in the picker
      setBillFromTop(true);
      setBillEditing(null);
      setBillVendorId('');
      setBillOpen(true);
    } catch (error: any) {
      showToast(error.message || 'Failed to load open batches', 'error');
    } finally {
      setOpeningBill(false);
    }
  };

  const openEditBill = (bill: BatchVendorBill) => {
    setBillFromTop(false);
    setBillEditing(bill);
    setBillOpen(true);
  };

  const removeBill = async (batch: Batch, bill: BatchVendorBill) => {
    const confirm = await Swal.fire({
      title: `Remove ${bill.vendor_name} from ${batch.label}?`,
      text: 'Its bill and pictures are deleted. Only possible while none of its stock went in.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(batch.id);
    try {
      const response = await fetch(`/api/warehouse-batches/${batch.id}/vendors/${bill.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error(await errorOf(response, 'Failed to remove vendor'));
      replaceBatch(await response.json());
      showToast(`${bill.vendor_name} removed`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove vendor', 'error');
    } finally {
      setBusyId(null);
    }
  };

  // The batch the bill pop-up adds to, and the vendors not in it yet
  const billBatch = billFromTop ? openBatches.find((b) => b.id === billBatchId) || null : viewing;
  const vendorsToAdd = vendors.filter((v) => !billBatch?.vendors.some((b) => b.warehouse_vendor_id === v.ven_id));

  return (
    <div className="p-2 py-5">
      <PageHeader title="Warehouse Batches" />

      {/* Buttons left, Batches / Vendor Bills tabs right; search + filters open on the Search button */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => (billOpen && billFromTop ? setBillOpen(false) : openTopBill())}
            disabled={openingBill}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {openingBill && <span className="w-4 h-4 border-2 border-regal-black/30 border-t-regal-black rounded-full animate-spin" />}
            {openingBill ? 'Opening...' : billOpen && billFromTop ? 'Cancel' : '+ New Batch'}
          </button>
          <button
            onClick={() => {
              if (showSearch) {
                // Cancel: hidden filters must not keep narrowing the list
                setSearchTerm('');
                setVendorFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }
              setShowSearch(!showSearch);
            }}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
          >
            {!showSearch && (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {showSearch ? 'Cancel' : 'Search'}
          </button>
        </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([['batches', 'Batches'], ['bills', 'Vendor Bills']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  tab === key ? 'bg-regal-yellow text-regal-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showSearch && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-2">
            <SearchBox
              value={searchTerm}
              onChange={setSearchTerm}
              resetPage={() => setCurrentPage(1)}
              id="batchSearchInput"
              placeholder="Batch no, vendor or code..."
              inputClassName="regal-input w-full pl-10 pr-4 py-4"
              autoFocus
            />
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="regal-input w-full sm:w-56"
            >
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.ven_id} value={v.ven_id}>
                  {vendorLabel(v)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="regal-input w-full sm:w-40"
            >
              <option value="">Open + Closed</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        )}
      </div>

      {/* "+ New Batch": on the page like Add Product - batch (or create one), vendor, bill */}
      {billFromTop && (
        <VendorBillModal
          inline
          isOpen={billOpen}
          onClose={() => setBillOpen(false)}
          batch={billBatch}
          bill={null}
          vendorId={billVendorId}
          vendorName={vendors.find((v) => v.ven_id === billVendorId)?.ven_name || ''}
          vendorPicker={
            <VendorPicker
              value={billVendorId}
              vendors={vendorsToAdd}
              onChange={setBillVendorId}
              onCreate={(typedName) => setVendorForm({ ...emptyVendorForm, name: typedName })}
            />
          }
          batchPicker={
            <BatchPicker
              value={billBatchId}
              batches={openBatches}
              onChange={setBillBatchId}
              onCreated={(batch) => {
                setOpenBatches((list) => [batch, ...list]);
                setBillBatchId(batch.id);
                fetchBatches();
              }}
            />
          }
          onSaved={(batch) => {
            replaceBatch(batch as Batch);
            setOpenBatches((list) => list.map((b) => (b.id === batch.id ? (batch as Batch) : b)));
            setBillVendorId('');
          }}
        />
      )}

      {showForm && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? `Edit ${editing.label}` : 'New Batch'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={form.batch_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, batch_date: e.target.value }))}
                  className="regal-input w-full"
                  required
                />
                {!editing && <p className="text-xs text-gray-500 mt-1">Batch number is given automatically. Vendors are added as their goods arrive.</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="regal-input w-full"
                  maxLength={500}
                  placeholder="Optional - e.g. container / truck"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : editing ? 'Update Batch' : 'Save Batch'}
              </button>
              <button type="button" onClick={closeForm} className="regal-btn bg-gray-300 text-black">
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      ) : tab === 'bills' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-100 border-b">
              <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                <th className="px-3 py-4 text-left">Vendor</th>
                <th className="px-3 py-4 text-left">Batch</th>
                <th className="px-3 py-4 text-left">Date</th>
                <th className="px-3 py-4 text-right">Bill</th>
                <th className="px-3 py-4 text-right">Freight</th>
                <th className="px-3 py-4 text-right">Cartage</th>
                <th className="px-3 py-4 text-right">Markup</th>
                <th className="px-3 py-4 text-left w-44">Stocked</th>
                <th className="px-3 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No vendor bills yet
                  </td>
                </tr>
              )}
              {bills.map((v) => {
                const over = v.stocked_total > v.invoice_total;
                return (
                  <tr key={v.id} onClick={() => openBillBatch(v.batch_id)} className="hover:bg-gray-50 text-sm cursor-pointer">
                    <td className="px-3 py-3">
                      <span className="font-medium">{v.vendor_name}</span>
                      {v.vendor_code && <span className="ml-1 text-xs text-gray-500">({v.vendor_code})</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{batchNo(v.batch_no)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{showDate(v.bill_date)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{money(v.invoice_total)}</td>
                    <td className="px-3 py-3 text-right">{v.freight_pct}%</td>
                    <td className="px-3 py-3 text-right">{v.cartage_pct}%</td>
                    <td className="px-3 py-3 text-right">{v.markup_pct}%</td>
                    <td className="px-3 py-3">
                      <div className={`text-xs ${over ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {money(v.stocked_total)}
                        <span className="text-gray-400"> / {money(v.invoice_total)}</span>
                      </div>
                      <Progress done={v.stocked_total} total={v.invoice_total} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${v.batch_status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {v.batch_status === 'OPEN' ? 'Open' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-100 border-b">
              <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                <th className="px-3 py-4 text-left">Batch</th>
                <th className="px-3 py-4 text-left">Date</th>
                <th className="px-3 py-4 text-left">Vendors</th>
                <th className="px-3 py-4 text-right">Bills</th>
                <th className="px-3 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No batches yet
                  </td>
                </tr>
              )}
              {batches.map((b) => (
                <tr key={b.id} onClick={() => openDetails(b)} className="hover:bg-gray-50 text-sm cursor-pointer">
                  <td className="px-3 py-3 font-medium whitespace-nowrap">{batchNo(b.batch_no)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{showDate(b.batch_date)}</td>
                  <td className="px-3 py-3">
                    {b.vendors.length ? (
                      <>
                        <div className="font-medium">{b.vendor_count} vendor{b.vendor_count > 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{b.vendors.map((v) => v.vendor_name).join(', ')}</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No vendor yet</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{money(b.invoice_total)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        b.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}
                      title={b.closed_at ? `Closed by ${b.closed_by_name || ''} on ${new Date(b.closed_at).toLocaleString('en-GB')}` : undefined}
                    >
                      {b.status === 'OPEN' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            baseUrl=""
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {viewing && (
        <div className={`fixed inset-0 z-50 flex justify-end ${panelOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              panelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closeDetails}
          ></div>

          <div
            className={`relative w-full sm:w-1/2 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              panelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header: batch no + status, then date / who / note in one line */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">{viewing.label}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      viewing.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {viewing.status === 'OPEN' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {showDate(viewing.batch_date)}
                  {viewing.created_by_name && ` · by ${viewing.created_by_name}`}
                  {viewing.closed_at && ` · closed ${new Date(viewing.closed_at).toLocaleDateString('en-GB')}${viewing.closed_by_name ? ` by ${viewing.closed_by_name}` : ''}`}
                </p>
                {viewing.note && <p className="text-sm text-gray-700 mt-1">{viewing.note}</p>}
              </div>
              <button onClick={closeDetails} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Totals at a glance */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Vendors</p>
                  <p className="text-xl font-semibold">{viewing.vendors.length}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Bills</p>
                  <p className="text-xl font-semibold">{money(viewing.invoice_total)}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Stocked</p>
                  <p className="text-xl font-semibold">{money(viewing.stocked_total)}</p>
                  <Progress done={viewing.stocked_total} total={viewing.invoice_total} />
                </div>
              </div>

              {/* Vendors in this lot, each with its own bill */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-800">Vendors</h3>
                  {viewing.status === 'OPEN' && (
                    <button onClick={openAddBill} className="regal-btn bg-regal-yellow text-regal-black !px-3 !py-1 text-sm">
                      + Add Vendor
                    </button>
                  )}
                </div>
                {viewing.vendors.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                    No vendor yet. Add one here, or at Stock In when its goods arrive.
                  </div>
                )}
                <div className="space-y-3">
                  {viewing.vendors.map((v) => {
                    const over = v.stocked_total > v.invoice_total;
                    return (
                      <div key={v.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {v.vendor_name}
                              {v.vendor_code && <span className="ml-1 text-xs font-normal text-gray-500">({v.vendor_code})</span>}
                            </p>
                            <p className="text-xs text-gray-500">{showDate(v.bill_date)}</p>
                          </div>
                          {viewing.status === 'OPEN' && (
                            <div className="flex gap-2">
                              {/* Edit = bill pictures only (a saved bill's figures never change) */}
                              <button onClick={() => openEditBill(v)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                                Edit
                              </button>
                              {/* Stock of the bill is in: it can no longer be removed */}
                              {v.locked && (
                                <span className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600" title="Stock of this bill is in - it cannot be removed">
                                  🔒 Locked
                                </span>
                              )}
                              {!v.locked && (
                                <button
                                  onClick={() => removeBill(viewing, v)}
                                  disabled={busyId === viewing.id}
                                  className="px-2 py-1 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                          {[
                            ['Bill', money(v.invoice_total)],
                            ['Freight', `${v.freight_pct}%`],
                            ['Cartage', `${v.cartage_pct}%`],
                            ['Markup', `${v.markup_pct}%`],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded bg-gray-50 py-2">
                              <p className="text-[11px] text-gray-500">{label}</p>
                              <p className="text-sm font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3">
                          <div className={`flex justify-between text-xs ${over ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            <span>Stocked {money(v.stocked_total)} of {money(v.invoice_total)}</span>
                            <span>{over ? 'More than the bill' : `${v.invoice_total > 0 ? Math.round((v.stocked_total / v.invoice_total) * 100) : 0}%`}</span>
                          </div>
                          <Progress done={v.stocked_total} total={v.invoice_total} />
                        </div>

                        {v.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {v.images.map((img) => (
                              <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" title="Open full size">
                                <img src={img.url} alt="Bill" className="h-14 w-14 object-cover border rounded hover:opacity-90" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewing.status === 'OPEN' && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      const batch = viewing;
                      closeDetails();
                      openEdit(batch);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black"
                  >
                    Edit Batch
                  </button>
                  <button
                    onClick={() => handleClose(viewing)}
                    disabled={busyId === viewing.id}
                    className="regal-btn bg-gray-300 text-black disabled:opacity-50"
                  >
                    Close Batch
                  </button>
                  <button
                    onClick={() => handleDelete(viewing)}
                    disabled={busyId === viewing.id}
                    className="regal-btn bg-red-600 text-white disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <VendorBillModal
        isOpen={billOpen && !billFromTop}
        onClose={() => setBillOpen(false)}
        batch={billBatch}
        bill={billEditing}
        vendorId={billVendorId}
        vendorName={vendors.find((v) => v.ven_id === billVendorId)?.ven_name || ''}
        vendorPicker={
          <VendorPicker
            value={billVendorId}
            vendors={vendorsToAdd}
            onChange={setBillVendorId}
            onCreate={(typedName) => setVendorForm({ ...emptyVendorForm, name: typedName })}
          />
        }
        onSaved={(batch) => replaceBatch(batch as Batch)}
      />

      <Modal isOpen={!!vendorForm} onClose={() => setVendorForm(null)} title="Add New Warehouse Vendor">
        {vendorForm && (
          <form onSubmit={saveVendor} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                className="regal-input w-full"
                placeholder="Enter vendor name"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input
                type="text"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                className="regal-input w-full"
                placeholder="Enter phone number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address *</label>
              <input
                type="text"
                value={vendorForm.address}
                onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                className="regal-input w-full"
                placeholder="Enter address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <select
                value={vendorForm.branch}
                onChange={(e) => setVendorForm({ ...vendorForm, branch: e.target.value })}
                className="regal-input w-full"
                required
              >
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savingVendor}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingVendor ? 'Saving...' : 'Add Vendor'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default WarehouseBatchesPage;
