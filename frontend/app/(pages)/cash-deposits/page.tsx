'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import ImageZoomViewer from '@/components/ui/ImageZoomViewer';
import { CASH_DEPOSITS_CHANGED } from '@/components/CashDepositBadge';
import { ArrowDownTrayIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';

type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Slip {
  id: string;
  file_url: string;
  bank_name: string;
  amount: number;
}

interface Deposit {
  id: string;
  deposit_no: string;
  cash_from: string;
  cash_to: string;
  deposit_date: string;
  total_amount: number;
  notes: string | null;
  status: DepositStatus;
  submitted_by: string;
  submitted_by_name: string | null;
  submitted_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  slip_count: number;
  slips: Slip[];
}

// One slip row in the New / Edit form: an existing slip (id + file_url) or a new file
interface SlipRow {
  key: string;
  id?: string;
  file_url?: string;
  file?: File;
  preview?: string;
  bank_name: string;
  amount: string;
}

const STATUS_OPTIONS: { label: string; value: '' | DepositStatus }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: '' },
];

const STATUS_BADGE: Record<DepositStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const BANKS = ['HBL', 'MCB', 'UBL', 'Meezan Bank', 'Islami Bank', 'Allied Bank', 'Bank Alfalah', 'Bank Al Habib', 'Faysal Bank', 'Askari Bank', 'National Bank'];
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PAGE_SIZE = 20;

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB');
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatAmount = (value: number) => value.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const newKey = () => Math.random().toString(36).slice(2);
const emptySlipRow = (): SlipRow => ({ key: newKey(), bank_name: '', amount: '' });

// Cloudinary "download" flag; the image itself stays original quality
// Saved as e.g. DEP-0012_slip_1.jpg instead of Cloudinary's random id
const downloadUrl = (url: string, name: string) =>
  url.replace('/upload/', `/upload/fl_attachment:${name.replace(/[^A-Za-z0-9_-]/g, '_')}/`);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CashDepositsPage: React.FC = () => {
  const { showToast } = useToast();

  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  // Filter inputs; applied on Fetch (like Sales View)
  const [statusFilter, setStatusFilter] = useState<'' | DepositStatus>('PENDING');
  // Smart search: a date (dd/mm or dd/mm/yyyy) or deposit no / bank / submitted by / amount
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<{ status: '' | DepositStatus; search: string }>({
    status: 'PENDING',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // New / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deposit | null>(null);
  const [cashFrom, setCashFrom] = useState(today());
  const [cashTo, setCashTo] = useState(today());
  const [depositDate, setDepositDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [slipRows, setSlipRows] = useState<SlipRow[]>([emptySlipRow()]);
  const [submitting, setSubmitting] = useState(false);

  // Review / detail
  // Right-side review panel (Shop Order Approval style)
  const [selected, setSelected] = useState<Deposit | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const isAdmin = role === 'admin';
  const canSubmit = role === 'admin' || role === 'cashier';
  const canReview = role === 'admin' || role === 'sales';
  const canEdit = (d: Deposit) =>
    d.status !== 'APPROVED' && (isAdmin || (role === 'cashier' && d.submitted_by === userId));

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setRole(data.user?.role || '');
          setUserId(data.user?.id || '');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUser();
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (applied.status) params.append('status_filter', applied.status);
    if (applied.search) params.append('search', applied.search);
    return params;
  }, [applied]);

  const applyFilters = () => {
    setApplied({ status: statusFilter, search: search.trim() });
    setCurrentPage(1);
  };

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildFilterParams();
      params.append('page', currentPage.toString());
      params.append('limit', PAGE_SIZE.toString());
      const response = await fetch(`/api/cash-deposits?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to fetch deposits', 'error');
        return;
      }
      setDeposits(data.data || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      showToast('Failed to fetch deposits', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, currentPage, showToast]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const formTotal = useMemo(
    () => slipRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [slipRows]
  );

  // ---------- form ----------

  const openNewForm = () => {
    setEditing(null);
    setCashFrom(today());
    setCashTo(today());
    setDepositDate(today());
    setNotes('');
    setSlipRows([emptySlipRow()]);
    setIsPanelOpen(false);
    setSelected(null);
    setShowForm(true);
  };

  const openEditForm = (d: Deposit) => {
    setIsPanelOpen(false);
    setSelected(null);
    setEditing(d);
    setCashFrom(d.cash_from);
    setCashTo(d.cash_to);
    setDepositDate(d.deposit_date);
    setNotes(d.notes || '');
    setSlipRows(
      d.slips.map((s) => ({
        key: s.id,
        id: s.id,
        file_url: s.file_url,
        bank_name: s.bank_name,
        amount: String(s.amount),
      }))
    );
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Free object URLs of new-slip previews
  const releasePreviews = () => slipRows.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));

  const closeForm = () => {
    if (submitting) return;
    releasePreviews();
    setShowForm(false);
    setEditing(null);
  };

  const updateSlipRow = (key: string, changes: Partial<SlipRow>) => {
    setSlipRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  };

  const handleSlipFile = (key: string, file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Only JPG, PNG or WebP images are allowed', 'error');
      return;
    }
    setSlipRows((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        if (r.preview) URL.revokeObjectURL(r.preview);
        // A saved slip whose image is changed becomes a new slip: its old id is
        // dropped, so on save the backend deletes the old one (DB + Cloudinary)
        return { ...r, id: undefined, file_url: undefined, file, preview: URL.createObjectURL(file) };
      })
    );
  };

  // Products-style "Delete Image": the row goes back to "Choose File". A saved
  // slip loses its id here, so on save the backend deletes it (DB + Cloudinary)
  const handleDeleteSlipImage = async (key: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This slip image will be deleted when you save.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    setSlipRows((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        if (r.preview) URL.revokeObjectURL(r.preview);
        return { ...r, id: undefined, file_url: undefined, file: undefined, preview: undefined };
      })
    );
  };

  const removeSlipRow = (key: string) => {
    setSlipRows((rows) => {
      const row = rows.find((r) => r.key === key);
      if (row?.preview) URL.revokeObjectURL(row.preview);
      return rows.filter((r) => r.key !== key);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (cashFrom > cashTo) {
      showToast('Cash From date must be before Cash To date', 'error');
      return;
    }
    if (slipRows.length === 0) {
      showToast('Add at least one slip', 'error');
      return;
    }
    for (let i = 0; i < slipRows.length; i++) {
      const r = slipRows[i];
      if (!r.id && !r.file) {
        showToast(`Slip ${i + 1}: select the slip image`, 'error');
        return;
      }
      if (!r.bank_name.trim()) {
        showToast(`Slip ${i + 1}: enter the bank name`, 'error');
        return;
      }
      if (!(parseFloat(r.amount) > 0)) {
        showToast(`Slip ${i + 1}: enter the amount`, 'error');
        return;
      }
    }

    const slipInfo = (r: SlipRow) => ({ bank_name: r.bank_name.trim(), amount: r.amount });
    const newRows = slipRows.filter((r) => !r.id);

    const formData = new FormData();
    formData.append('cash_from', cashFrom);
    formData.append('cash_to', cashTo);
    formData.append('deposit_date', depositDate);
    formData.append('notes', notes);
    if (editing) {
      formData.append('slip_updates', JSON.stringify(slipRows.filter((r) => r.id).map((r) => ({ id: r.id, ...slipInfo(r) }))));
      formData.append('new_slips', JSON.stringify(newRows.map(slipInfo)));
    } else {
      formData.append('slips', JSON.stringify(newRows.map(slipInfo)));
    }
    newRows.forEach((r) => formData.append('files', r.file as File, (r.file as File).name));

    try {
      setSubmitting(true);
      const response = await fetch(editing ? `/api/cash-deposits/${editing.id}` : '/api/cash-deposits', {
        method: editing ? 'PUT' : 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to save deposit', 'error');
        return;
      }
      showToast(editing ? `${data.deposit_no} resubmitted for approval` : `${data.deposit_no} submitted for approval`, 'success');
      releasePreviews();
      setShowForm(false);
      setEditing(null);
      // Show all pending (clear search) so the saved deposit is visible
      setStatusFilter('PENDING');
      setSearch('');
      if (applied.status === 'PENDING' && !applied.search && currentPage === 1) {
        fetchDeposits();
      } else {
        setApplied({ status: 'PENDING', search: '' });
        setCurrentPage(1);
      }
      window.dispatchEvent(new Event(CASH_DEPOSITS_CHANGED));
    } catch (error) {
      console.error('Error saving deposit:', error);
      showToast('Failed to save deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- review ----------

  const openDetail = (d: Deposit) => {
    setSelected(d);
    setIsPanelOpen(true);
    setRejectReason('');
    setShowRejectBox(false);
  };

  const closePanel = () => {
    if (reviewing) return;
    setIsPanelOpen(false);
    // Unmount after the slide-out transition, otherwise the invisible
    // fullscreen wrapper keeps blocking clicks on the page
    setTimeout(() => setSelected(null), 300);
  };

  const review = async (action: 'approve' | 'reject') => {
    if (!selected || reviewing) return;
    if (action === 'reject' && !rejectReason.trim()) {
      showToast('Write the reject reason', 'error');
      return;
    }
    try {
      setReviewing(true);
      const response = await fetch(`/api/cash-deposits/${selected.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        ...(action === 'reject'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: rejectReason.trim() }) }
          : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || `Failed to ${action} deposit`, 'error');
        return;
      }
      showToast(`${data.deposit_no} ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
      setIsPanelOpen(false);
      setTimeout(() => setSelected(null), 300);
      fetchDeposits();
      window.dispatchEvent(new Event(CASH_DEPOSITS_CHANGED));
    } catch (error) {
      console.error(`Error on ${action}:`, error);
      showToast(`Failed to ${action} deposit`, 'error');
    } finally {
      setReviewing(false);
    }
  };

  // ---------- render ----------

  const cashOf = (d: Deposit) =>
    d.cash_from === d.cash_to ? formatDate(d.cash_from) : `${formatDate(d.cash_from)} – ${formatDate(d.cash_to)}`;

  return (
    <div className="p-2 py-5">
      <PageHeader title="Cash Deposits" />

      {/* Line 1: action button */}
      {canSubmit && (
        <div className="mb-4">
          <button
            onClick={() => (showForm ? closeForm() : openNewForm())}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            {showForm && !editing ? 'Cancel' : '+ New Deposit'}
          </button>
        </div>
      )}

      {/* Line 2: filters (Sales View style) */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="grid grid-cols-2 md:flex gap-2 md:gap-4">
          <div className="col-span-2 md:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Date (03/10), Deposit No, Bank, Name, Amount"
              className="regal-input w-full"
            />
          </div>
          <div className="col-span-2 md:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | DepositStatus)}
              className="regal-input w-full"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={applyFilters}
            disabled={loading}
            className="text-regal-black w-24 bg-regal-yellow py-3 rounded-md text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form (inline, like Products) */}
      {showForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editing ? `Edit ${editing.deposit_no}` : 'New Cash Deposit'}
          </h3>

          {editing?.status === 'REJECTED' && editing.reject_reason && (
            <p className="mb-4 text-sm text-red-600">
              <span className="font-semibold">Rejected:</span> {editing.reject_reason}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cash From *</label>
                <input type="date" value={cashFrom} onChange={(e) => setCashFrom(e.target.value)} className="regal-input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cash To *</label>
                <input type="date" value={cashTo} onChange={(e) => setCashTo(e.target.value)} className="regal-input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deposit Date *</label>
                <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="regal-input w-full" required />
              </div>
            </div>

            <datalist id="bank-names">
              {BANKS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Bank Slips *</label>
              <div className="space-y-4">
                {slipRows.map((r, index) => {
                  const imageSrc = r.preview || r.file_url;
                  return (
                    <div key={r.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Slip {index + 1} Image *</label>
                        {imageSrc ? (
                          <div className="flex items-center gap-2">
                            <div className="relative group">
                              {/* Original URL (no Cloudinary optimizer) so slip text stays sharp */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageSrc}
                                alt={`Slip ${index + 1}`}
                                onClick={() => setZoomSrc(imageSrc)}
                                className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer"
                              />
                              {/* View Button */}
                              <button
                                type="button"
                                onClick={() => setZoomSrc(imageSrc)}
                                className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="View image"
                              >
                                <MagnifyingGlassPlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlipImage(r.key)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-lg transition-colors"
                              title="Delete image"
                            >
                              <span>Delete Image</span>
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleSlipFile(r.key, e.target.files?.[0])}
                            className="w-full my-2"
                          />
                        )}
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Bank *</label>
                        <input
                          type="text"
                          list="bank-names"
                          value={r.bank_name}
                          onChange={(e) => updateSlipRow(r.key, { bank_name: e.target.value })}
                          className="regal-input w-full"
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Amount *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.amount}
                          onChange={(e) => updateSlipRow(r.key, { amount: e.target.value })}
                          className="regal-input w-full"
                          placeholder="Enter amount"
                        />
                      </div>
                      <div className="md:col-span-2 pb-2">
                        <button
                          type="button"
                          onClick={() => removeSlipRow(r.key)}
                          disabled={slipRows.length === 1}
                          className={slipRows.length === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setSlipRows((rows) => [...rows, emptySlipRow()])}
                className="mt-3 text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                + Add Slip
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Notes <span className="font-normal text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="regal-input w-full"
                rows={2}
                maxLength={500}
                placeholder="Enter notes"
              />
            </div>

            <p className="mt-4 text-sm">
              Total: <span className="font-semibold">Rs. {formatAmount(formTotal)}</span>{' '}
              <span className="text-gray-500">({slipRows.length} slip{slipRows.length === 1 ? '' : 's'})</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`regal-btn bg-regal-yellow text-regal-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Uploading...
                  </span>
                ) : editing ? (
                  'Save & Resubmit'
                ) : (
                  'Submit for Approval'
                )}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className={`regal-btn bg-gray-300 text-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deposits Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="text-black font-semibold text-xs uppercase">
                  <th className="px-3 py-5 text-left w-12">S.No</th>
                  <th className="px-2 py-5 text-left w-28">Deposit No</th>
                  <th className="px-2 py-5 text-left w-28">Deposit Date</th>
                  <th className="px-2 py-5 text-left w-44">Cash Of</th>
                  <th className="px-2 py-5 text-left w-28">Total</th>
                  <th className="px-2 py-5 text-left w-32">Submitted By</th>
                  <th className="px-2 py-5 text-left w-28">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deposits.map((d, index) => (
                  <tr
                    key={d.id}
                    onClick={() => openDetail(d)}
                    className="text-sm text-gray-900 transition-colors cursor-pointer hover:bg-gray-50"
                    title="Click to view details"
                  >
                    <td className="px-3 py-4 whitespace-nowrap">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{d.deposit_no}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{formatDate(d.deposit_date)}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{cashOf(d)}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{formatAmount(d.total_amount)}</td>
                    <td className="px-2 py-4">{d.submitted_by_name || 'N/A'}</td>
                    <td className="px-2 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {deposits.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">No deposits found.</div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            baseUrl="/cash-deposits"
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Right-side review panel (Shop Order Approval style) */}
      {selected && (
        <div className={`fixed inset-0 z-50 flex justify-end ${isPanelOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              isPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closePanel}
          ></div>

          <div
            className={`relative w-full sm:w-2/5 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Deposit Details</h2>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Deposit No</span>
                <span className="text-sm font-medium text-gray-900">{selected.deposit_no}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${STATUS_BADGE[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Cash Of</span>
                <span className="text-sm font-medium text-gray-900">{cashOf(selected)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Deposit Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selected.deposit_date)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Submitted By</span>
                <span className="text-sm font-medium text-gray-900 text-right">
                  {selected.submitted_by_name || '-'}
                  <span className="block text-xs font-normal text-gray-500">{formatDateTime(selected.submitted_at)}</span>
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-sm font-semibold text-gray-900">Rs. {formatAmount(selected.total_amount)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Notes</span>
                <span className="text-sm font-medium text-gray-900 text-right ml-4">{selected.notes || '-'}</span>
              </div>
              {selected.status !== 'PENDING' && selected.reviewed_by_name && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">{selected.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">
                    {selected.reviewed_by_name}
                    {selected.reviewed_at && (
                      <span className="block text-xs font-normal text-gray-500">{formatDateTime(selected.reviewed_at)}</span>
                    )}
                  </span>
                </div>
              )}
              {selected.reject_reason && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">Reject Reason</span>
                  <span className="text-sm font-medium text-red-600 text-right ml-4">{selected.reject_reason}</span>
                </div>
              )}

              {/* Slips: full-width image (original URL, sharp text), click to zoom */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Bank Slips ({selected.slips.length})</p>
                <div className="space-y-3">
                  {selected.slips.map((s, index) => (
                    <div key={s.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setZoomSrc(s.file_url)}
                        className="group relative block w-full bg-gray-50"
                        title="Click to zoom"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.file_url} alt={`Slip ${index + 1}`} className="h-56 w-full object-contain" />
                        {/* Zoom hint: always visible on touch, on hover for mouse */}
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
                          Zoom
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            Slip {index + 1} of {selected.slips.length}
                          </p>
                          <p className="truncate text-sm text-gray-900">
                            {s.bank_name} · <span className="font-semibold">Rs. {formatAmount(s.amount)}</span>
                          </p>
                        </div>
                        <a
                          href={downloadUrl(s.file_url, `${selected.deposit_no}_slip_${index + 1}`)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-regal-yellow hover:bg-regal-yellow hover:text-regal-black"
                          title={`Download ${selected.deposit_no} slip ${index + 1}`}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {canReview && selected.status === 'PENDING' && showRejectBox && (
                <div>
                  <label className="block text-sm font-medium mb-1">Reject Reason *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="regal-input w-full"
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. Slip 2 amount does not match the image"
                    autoFocus
                  />
                </div>
              )}

              {canReview && selected.status === 'PENDING' && (
                <div className="pt-4 flex gap-2">
                  {showRejectBox ? (
                    <>
                      <button
                        onClick={() => setShowRejectBox(false)}
                        disabled={reviewing}
                        className="regal-btn bg-gray-300 text-black flex-1 py-2 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => review('reject')}
                        disabled={reviewing}
                        className="regal-btn bg-red-500 text-white flex-1 py-2 disabled:opacity-50"
                      >
                        {reviewing ? 'Please wait...' : 'Confirm Reject'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => review('approve')}
                        disabled={reviewing}
                        className="regal-btn bg-green-500 text-white flex-1 py-2 disabled:opacity-50"
                      >
                        {reviewing ? 'Please wait...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectBox(true)}
                        disabled={reviewing}
                        className="regal-btn bg-red-500 text-white flex-1 py-2 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )}

              {canEdit(selected) && (
                <div className={canReview && selected.status === 'PENDING' ? '' : 'pt-4'}>
                  <button
                    onClick={() => openEditForm(selected)}
                    disabled={reviewing}
                    className="regal-btn bg-regal-yellow text-regal-black w-full py-2 disabled:opacity-50"
                  >
                    {selected.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {zoomSrc && <ImageZoomViewer src={zoomSrc} alt="Bank slip" onClose={() => setZoomSrc(null)} />}
    </div>
  );
};

export default CashDepositsPage;
