'use client';

import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import SearchBox from '@/components/ui/SearchBox';
import Modal from '@/components/ui/Modal';
import { ShopBatch, fetchShopBatches, shopBatchCall, shopBatchOption } from '@/lib/shopBatches';

// Shop batches (BATCH_COSTING_PLAN.md sec 12) - same look as Warehouse Batches: Shop Batch 001,
// 002 ... one count for both shops, with the shop vendors whose goods came in it. No bill:
// a product's cost / price are typed at its first Stock In in the batch, then locked.

interface Vendor {
  id: string;
  name: string;
  vendor_code?: string | null;
}

const PAGE_SIZE = 20;

// Local date (not UTC) so late-night entries keep today's date
const today = () => new Date().toLocaleDateString('en-CA');
const emptyForm = () => ({ batch_date: today(), note: '' });
const showDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB');
const vendorLabel = (v: { name: string; vendor_code?: string | null }) => `${v.name.trim()}${v.vendor_code ? ` (${v.vendor_code})` : ''}`;

/**
 * Batch picker like Warehouse Batches: the field is the search box, the list opens below with
 * "+ Create batch" on top, which opens a small pop-up (number shown at once, date, note).
 */
function BatchPicker({ value, batches, nextLabel, onChange, onCreated }: {
  value: string;
  batches: ShopBatch[];
  nextLabel: string;
  onChange: (id: string) => void;
  onCreated: (batch: ShopBatch) => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const [newForm, setNewForm] = useState<ReturnType<typeof emptyForm> | null>(null); // null = pop-up closed
  const [creating, setCreating] = useState(false);

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
  const shown = batches.filter((b) => shopBatchOption(b).toLowerCase().includes(term));

  function close() {
    setOpen(false);
    setQ('');
    setAt(-1);
  }

  const pick = (id: string) => {
    onChange(id);
    close();
  };

  const startCreate = () => {
    setNewForm({ ...emptyForm(), note: q.trim() });
    close();
  };

  const create = async () => {
    if (!newForm || creating) return;
    setCreating(true);
    try {
      const batch: ShopBatch = await shopBatchCall('', 'POST', newForm);
      (batch.branch_warnings || []).forEach((w) => showToast(w, 'warning'));
      setNewForm(null);
      onCreated(batch);
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
        value={open ? q : chosen ? shopBatchOption(chosen) : ''}
        placeholder={open && chosen ? shopBatchOption(chosen) : 'Search or create batch'}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setAt(-1); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAt(Math.min(at + 1, shown.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(at - 1, -1)); }
          if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (at >= 0 && shown[at]) pick(shown[at].id);
            else if (shown.length === 1 && term) pick(shown[0].id);
            else startCreate();
          }
        }}
        className="regal-input w-full pr-8"
      />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-gray-500">▼</span>
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
              <span className="truncate">{shopBatchOption(b)}</span>
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
          <div className="space-y-4" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}>
            {/* Given automatically - shown, not editable */}
            <div>
              <label className="block text-sm font-medium mb-1">Batch No</label>
              <input value={nextLabel || '...'} readOnly tabIndex={-1} className="regal-input w-full bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" value={newForm.batch_date} onChange={(e) => setNewForm({ ...newForm, batch_date: e.target.value })}
                     className="regal-input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input type="text" value={newForm.note} onChange={(e) => setNewForm({ ...newForm, note: e.target.value })}
                     className="regal-input w-full" maxLength={500} placeholder="Optional - e.g. new prices 2027" autoFocus />
            </div>
            <button type="button" onClick={create} disabled={creating || !newForm.batch_date}
                    className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

const ShopBatchesPage: React.FC = () => {
  const { showToast } = useToast();

  const [batches, setBatches] = useState<ShopBatch[]>([]);
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
  const [editing, setEditing] = useState<ShopBatch | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [nextNo, setNextNo] = useState<string>('');
  // Right-side details panel
  const [viewing, setViewing] = useState<ShopBatch | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // "+ Add Vendor" pop-up
  const [addOpen, setAddOpen] = useState(false);
  const [addVendorId, setAddVendorId] = useState('');
  // "+ New Batch": one form on the page - choose (or create) the batch, then the vendor
  const [topOpen, setTopOpen] = useState(false);
  const [openBatches, setOpenBatches] = useState<ShopBatch[]>([]);
  const [topBatchId, setTopBatchId] = useState('');
  const [topVendorId, setTopVendorId] = useState('');
  const [openingTop, setOpeningTop] = useState(false);

  const warn = (data: any) => (data?.branch_warnings || []).forEach((w: string) => showToast(w, 'warning'));

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors/?skip=0&limit=1000', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load vendors');
      const data = await response.json();
      setVendors((Array.isArray(data) ? data : data.vendors || []).map((v: any) => ({ id: v.id, name: v.name, vendor_code: v.vendor_code })));
    } catch (error: any) {
      showToast(error.message || 'Failed to load vendors', 'error');
    }
  };

  const loadNextNo = () =>
    fetch('/api/shop-batches/next-number', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setNextNo(data?.label || ''))
      .catch(() => setNextNo(''));

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
      if (vendorFilter) params.append('vendor_id', vendorFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/shop-batches?${params.toString()}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load batches');
      setBatches(data.data || []);
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
    loadNextNo();
    // Open batches for "+ New Batch", loaded ahead so the form opens at once
    fetchShopBatches('OPEN').then(setOpenBatches).catch(() => setOpenBatches([]));
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [currentPage, vendorFilter, statusFilter, searchTerm]);

  const closeForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setShowForm(false);
  };

  const jsId = () => vendors.find((v) => v.name.trim().toLowerCase() === 'j&s sports')?.id || '';

  const openNew = async () => {
    if (topOpen) { setTopOpen(false); return; }
    closeForm();
    setTopBatchId(openBatches[0]?.id || ''); // newest; none open = create one in the picker
    setTopVendorId(jsId());
    setTopOpen(true);
    // Refresh in the background (another shop may have made one)
    setOpeningTop(true);
    fetchShopBatches('OPEN')
      .then((list) => { setOpenBatches(list); setTopBatchId((cur) => cur || list[0]?.id || ''); })
      .catch(() => undefined)
      .finally(() => setOpeningTop(false));
    loadNextNo();
  };

  const topBatch = openBatches.find((b) => b.id === topBatchId) || null;
  const topVendorsToAdd = vendors.filter((v) => !topBatch?.vendors.some((b) => b.vendor_id === v.id));

  const addTopVendor = async () => {
    if (!topBatch || !topVendorId || busyId) return;
    setBusyId(topBatch.id);
    try {
      const updated: ShopBatch = await shopBatchCall(`/${topBatch.id}/vendors`, 'POST', { vendor_id: topVendorId });
      warn(updated);
      setOpenBatches((list) => list.map((b) => (b.id === updated.id ? updated : b)));
      replaceBatch(updated);
      setTopVendorId('');
      showToast(`Vendor added to ${updated.label}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add vendor', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (batch: ShopBatch) => {
    setEditing(batch);
    setForm({ batch_date: batch.batch_date, note: batch.note || '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetails = (batch: ShopBatch) => {
    setViewing(batch);
    setPanelOpen(true);
  };

  const closeDetails = () => {
    setPanelOpen(false);
    // Unmount after the slide-out, or the invisible overlay keeps blocking clicks
    setTimeout(() => setViewing(null), 300);
  };

  const replaceBatch = (updated: ShopBatch) => {
    setBatches((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    if (editing?.id === updated.id) setEditing(updated);
    if (viewing?.id === updated.id) setViewing(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const saved: ShopBatch = await shopBatchCall(editing ? `/${editing.id}` : '', editing ? 'PUT' : 'POST',
        { batch_date: form.batch_date, note: form.note });
      warn(saved);
      Swal.fire({
        title: editing ? 'Updated!' : 'Created!',
        text: editing ? saved.label : `${saved.label} - add the vendor (J&S Sports), then pick it at Stock In`,
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

  const handleClose = async (batch: ShopBatch) => {
    const confirm = await Swal.fire({
      title: `Close ${batch.label}?`,
      text: 'A closed batch cannot be edited and will not show at Stock In (in both shops). Its stock still sells.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Close batch',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(batch.id);
    try {
      const updated = await shopBatchCall(`/${batch.id}/close`, 'POST');
      warn(updated);
      replaceBatch(updated);
      if (editing?.id === batch.id) closeForm();
      showToast(`${batch.label} closed`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to close batch', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (batch: ShopBatch) => {
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
      const result = await shopBatchCall(`/${batch.id}`, 'DELETE');
      warn(result);
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

  const addVendor = async () => {
    if (!viewing || !addVendorId || busyId) return;
    setBusyId(viewing.id);
    try {
      const updated = await shopBatchCall(`/${viewing.id}/vendors`, 'POST', { vendor_id: addVendorId });
      warn(updated);
      replaceBatch(updated);
      setAddOpen(false);
      setAddVendorId('');
      showToast('Vendor added', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add vendor', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const removeVendor = async (batch: ShopBatch, batchVendorId: string, name: string) => {
    const confirm = await Swal.fire({
      title: `Remove ${name} from ${batch.label}?`,
      text: 'Only possible while none of its stock went in.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(batch.id);
    try {
      const updated = await shopBatchCall(`/${batch.id}/vendors/${batchVendorId}`, 'DELETE');
      warn(updated);
      replaceBatch(updated);
      showToast(`${name} removed`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove vendor', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const vendorsToAdd = vendors.filter((v) => !viewing?.vendors.some((b) => b.vendor_id === v.id));

  return (
    <div className="p-2 py-5">
      <PageHeader title="Shop Batches" />

      {/* Buttons; search + filters open on the Search button */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={openNew} className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2">
            {topOpen ? 'Cancel' : '+ New Batch'}
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

        {showSearch && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-2">
            <SearchBox
              value={searchTerm}
              onChange={setSearchTerm}
              resetPage={() => setCurrentPage(1)}
              id="shopBatchSearchInput"
              placeholder="Batch no, vendor or note..."
              inputClassName="regal-input w-full pl-10 pr-4 py-4"
              autoFocus
            />
            <select
              value={vendorFilter}
              onChange={(e) => { setVendorFilter(e.target.value); setCurrentPage(1); }}
              className="regal-input w-full sm:w-56"
            >
              <option value="">All vendors</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="regal-input w-full sm:w-40"
            >
              <option value="">Open + Closed</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        )}
      </div>

      {topOpen && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">New Batch</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-sm font-medium mb-1">Batch *</label>
              <BatchPicker
                value={topBatchId}
                batches={openBatches}
                nextLabel={nextNo}
                onChange={setTopBatchId}
                onCreated={(batch) => {
                  setOpenBatches((list) => [batch, ...list]);
                  setTopBatchId(batch.id);
                  setTopVendorId((cur) => cur || jsId());
                  fetchBatches();
                  loadNextNo();
                }}
              />
              {openingTop && <p className="text-xs text-gray-400 mt-1">Refreshing open batches...</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor *</label>
              <select value={topVendorId} onChange={(e) => setTopVendorId(e.target.value)} className="regal-input w-full" disabled={!topBatch}>
                <option value="">{topBatch ? 'Select Vendor' : 'Choose or create the batch first'}</option>
                {topVendorsToAdd.map((v) => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addTopVendor} disabled={!topBatch || !topVendorId || !!busyId}
                    className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
              {busyId ? 'Saving...' : 'Add Vendor to Batch'}
            </button>
            <button type="button" onClick={() => setTopOpen(false)} className="regal-btn bg-gray-300 text-black">
              Close
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? `Edit ${editing.label}` : 'New Batch'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Given automatically - shown, not editable */}
              <div>
                <label className="block text-sm font-medium mb-1">Batch No</label>
                <input value={editing ? editing.label : nextNo || '...'} readOnly tabIndex={-1}
                       className="regal-input w-full bg-gray-100 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={form.batch_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, batch_date: e.target.value }))}
                  className="regal-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="regal-input w-full"
                  maxLength={500}
                  placeholder="Optional - e.g. new prices 2027"
                />
              </div>
            </div>
            {!editing && <p className="text-xs text-gray-500 mt-2">Batch number is given automatically, one count for both shops. The batch is made in both shops.</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={submitting} className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-100 border-b">
              <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                <th className="px-3 py-4 text-left">Batch</th>
                <th className="px-3 py-4 text-left">Date</th>
                <th className="px-3 py-4 text-left">Vendors</th>
                <th className="px-3 py-4 text-left">Note</th>
                <th className="px-3 py-4 text-right">Products</th>
                <th className="px-3 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">No batches yet</td>
                </tr>
              )}
              {batches.map((b) => (
                <tr key={b.id} onClick={() => openDetails(b)} className="hover:bg-gray-50 text-sm cursor-pointer">
                  <td className="px-3 py-3 font-medium whitespace-nowrap">{b.label}</td>
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
                  <td className="px-3 py-3 text-gray-600 truncate max-w-xs">{b.note || '-'}</td>
                  <td className="px-3 py-3 text-right">{b.line_count}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${b.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}
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
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${panelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`}
            onClick={closeDetails}
          ></div>

          <div
            className={`relative w-full sm:w-1/2 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              panelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header: batch no + status, then date / who / note */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">{viewing.label}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${viewing.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Vendors</p>
                  <p className="text-xl font-semibold">{viewing.vendors.length}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Products</p>
                  <p className="text-xl font-semibold">{viewing.line_count}</p>
                </div>
              </div>

              {/* Vendors in this batch (no bill) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-800">Vendors</h3>
                  {viewing.status === 'OPEN' && (
                    <button onClick={() => { setAddVendorId(''); setAddOpen(true); }} className="regal-btn bg-regal-yellow text-regal-black !px-3 !py-1 text-sm">
                      + Add Vendor
                    </button>
                  )}
                </div>
                {viewing.vendors.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                    No vendor yet. Add one here, or at Stock In.
                  </div>
                )}
                <div className="space-y-3">
                  {viewing.vendors.map((v) => (
                    <div key={v.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {v.vendor_name}
                            {v.vendor_code && <span className="ml-1 text-xs font-normal text-gray-500">({v.vendor_code})</span>}
                          </p>
                          <p className="text-xs text-gray-500">{v.line_count} product{v.line_count !== 1 ? 's' : ''} stocked in</p>
                        </div>
                        {viewing.status === 'OPEN' && (
                          <div className="flex gap-2">
                            {v.locked ? (
                              <span className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600" title="Stock of this vendor is in - it cannot be removed">
                                🔒 Locked
                              </span>
                            ) : (
                              <button
                                onClick={() => removeVendor(viewing, v.id, v.vendor_name)}
                                disabled={busyId === viewing.id}
                                className="px-2 py-1 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                  <button onClick={() => handleClose(viewing)} disabled={busyId === viewing.id} className="regal-btn bg-gray-300 text-black disabled:opacity-50">
                    Close Batch
                  </button>
                  <button onClick={() => handleDelete(viewing)} disabled={busyId === viewing.id} className="regal-btn bg-red-600 text-white disabled:opacity-50">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={`Add Vendor${viewing ? ` to ${viewing.label}` : ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor *</label>
            <select value={addVendorId} onChange={(e) => setAddVendorId(e.target.value)} className="regal-input w-full" autoFocus>
              <option value="">Select Vendor</option>
              {vendorsToAdd.map((v) => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}
            </select>
          </div>
          <button onClick={addVendor} disabled={!addVendorId || !!busyId} className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed">
            {busyId ? 'Adding...' : 'Add Vendor'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ShopBatchesPage;
