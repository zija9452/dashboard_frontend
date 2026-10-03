'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import ImageZoomViewer from '@/components/ui/ImageZoomViewer';
import { CASH_DEPOSITS_CHANGED } from '@/components/CashDepositBadge';

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
const downloadUrl = (url: string) => url.replace('/upload/', '/upload/fl_attachment/');

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState<{ status: '' | DepositStatus; from: string; to: string }>({
    status: 'PENDING',
    from: '',
    to: '',
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
  const [selected, setSelected] = useState<Deposit | null>(null);
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
    if (applied.from) params.append('from_date', applied.from);
    if (applied.to) params.append('to_date', applied.to);
    return params;
  }, [applied]);

  const applyFilters = () => {
    setApplied({ status: statusFilter, from: fromDate, to: toDate });
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
    setSelected(null);
    setShowForm(true);
  };

  const openEditForm = (d: Deposit) => {
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
        return { ...r, file, preview: URL.createObjectURL(file) };
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
      setStatusFilter('PENDING');
      if (applied.status === 'PENDING' && currentPage === 1) {
        fetchDeposits();
      } else {
        setApplied((f) => ({ ...f, status: 'PENDING' }));
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
    if (showForm) closeForm();
    setSelected(d);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setRejectReason('');
    setShowRejectBox(false);
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
      setSelected(null);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="regal-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="regal-input w-full" />
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
                        <div className="flex items-center gap-3">
                          {imageSrc && (
                            <button
                              type="button"
                              onClick={() => setZoomSrc(imageSrc)}
                              className="h-12 w-12 shrink-0 overflow-hidden rounded border border-gray-200"
                              title="Click to zoom"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imageSrc} alt={`Slip ${index + 1}`} className="h-full w-full object-cover" />
                            </button>
                          )}
                          {r.id ? (
                            <span className="text-sm text-gray-500">Saved slip</span>
                          ) : (
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => handleSlipFile(r.key, e.target.files?.[0])}
                              className="regal-input w-full text-sm"
                            />
                          )}
                        </div>
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

      {/* Review / Detail (inline) */}
      {selected && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
            {selected.deposit_no}
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600">Cash Of</p>
              <p className="font-medium text-gray-900">{cashOf(selected)}</p>
            </div>
            <div>
              <p className="text-gray-600">Deposit Date</p>
              <p className="font-medium text-gray-900">{formatDate(selected.deposit_date)}</p>
            </div>
            <div>
              <p className="text-gray-600">Submitted By</p>
              <p className="font-medium text-gray-900">{selected.submitted_by_name || '-'}</p>
              <p className="text-xs text-gray-500">{formatDateTime(selected.submitted_at)}</p>
            </div>
            <div>
              <p className="text-gray-600">Total</p>
              <p className="font-semibold text-gray-900">Rs. {formatAmount(selected.total_amount)}</p>
            </div>
          </div>

          {selected.notes && (
            <p className="text-sm mb-4">
              <span className="text-gray-600">Notes: </span>
              {selected.notes}
            </p>
          )}

          {selected.status !== 'PENDING' && selected.reviewed_by_name && (
            <p className={`text-sm mb-4 ${selected.status === 'APPROVED' ? 'text-green-700' : 'text-red-600'}`}>
              {selected.status === 'APPROVED' ? 'Approved' : 'Rejected'} by <span className="font-semibold">{selected.reviewed_by_name}</span>
              {selected.reviewed_at && <> on {formatDateTime(selected.reviewed_at)}</>}
              {selected.reject_reason && (
                <>
                  {' '}
                  — <span className="font-semibold">Reason:</span> {selected.reject_reason}
                </>
              )}
            </p>
          )}

          <div className="overflow-x-auto mb-4">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="text-black font-semibold text-xs uppercase">
                  <th className="px-3 py-5 text-left w-24">Slip</th>
                  <th className="px-2 py-5 text-left">Bank</th>
                  <th className="px-2 py-5 text-left">Amount</th>
                  <th className="px-2 py-5 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selected.slips.map((s, index) => (
                  <tr key={s.id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setZoomSrc(s.file_url)}
                        className="h-16 w-16 overflow-hidden rounded border border-gray-200"
                        title="Click to zoom"
                      >
                        {/* Original URL (no Cloudinary optimizer) so slip text stays sharp */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.file_url} alt={`Slip ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    </td>
                    <td className="px-2 py-3">{s.bank_name}</td>
                    <td className="px-2 py-3 whitespace-nowrap">{formatAmount(s.amount)}</td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button type="button" onClick={() => setZoomSrc(s.file_url)} className="text-blue-600 hover:text-blue-900">
                          View
                        </button>
                        <a href={downloadUrl(s.file_url)} className="text-blue-600 hover:text-blue-900">
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canReview && selected.status === 'PENDING' && showRejectBox && (
            <div className="mb-4">
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

          <div className="flex flex-wrap gap-2">
            {canReview && selected.status === 'PENDING' && !showRejectBox && (
              <>
                <button
                  onClick={() => review('approve')}
                  disabled={reviewing}
                  className="bg-green-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reviewing ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectBox(true)}
                  disabled={reviewing}
                  className="bg-red-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </>
            )}
            {canReview && selected.status === 'PENDING' && showRejectBox && (
              <button
                onClick={() => review('reject')}
                disabled={reviewing}
                className="bg-red-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            )}
            {canEdit(selected) && (
              <button onClick={() => openEditForm(selected)} disabled={reviewing} className="regal-btn bg-regal-yellow text-regal-black">
                {selected.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
              </button>
            )}
            <button
              onClick={() => (showRejectBox ? setShowRejectBox(false) : setSelected(null))}
              disabled={reviewing}
              className={`regal-btn bg-gray-300 text-black ${reviewing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {showRejectBox ? 'Cancel' : 'Close'}
            </button>
          </div>
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
                  <th className="px-2 py-5 text-center w-16">Slips</th>
                  <th className="px-2 py-5 text-left w-28">Total</th>
                  <th className="px-2 py-5 text-left w-32">Submitted By</th>
                  <th className="px-2 py-5 text-left w-28">Status</th>
                  <th className="px-2 py-5 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deposits.map((d, index) => (
                  <tr key={d.id} className="hover:bg-gray-50 text-sm text-gray-900">
                    <td className="px-3 py-4 whitespace-nowrap">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{d.deposit_no}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{formatDate(d.deposit_date)}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{cashOf(d)}</td>
                    <td className="px-2 py-4 text-center">{d.slip_count}</td>
                    <td className="px-2 py-4 whitespace-nowrap">{formatAmount(d.total_amount)}</td>
                    <td className="px-2 py-4">{d.submitted_by_name || 'N/A'}</td>
                    <td className="px-2 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button onClick={() => openDetail(d)} className="text-blue-600 hover:text-blue-900">
                          {canReview && d.status === 'PENDING' ? 'Review' : 'View'}
                        </button>
                        {canEdit(d) && (
                          <button onClick={() => openEditForm(d)} className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        )}
                      </div>
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

      {zoomSrc && <ImageZoomViewer src={zoomSrc} alt="Bank slip" onClose={() => setZoomSrc(null)} />}
    </div>
  );
};

export default CashDepositsPage;
