'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import ImageZoomViewer from '@/components/ui/ImageZoomViewer';
import { CASH_DEPOSITS_CHANGED } from '@/components/CashDepositBadge';
import {
  MAX_PROOF_IMAGES, PAYMENT_PROOFS_CHANGED, PaymentProof, proofFilesError, uploadProofImages,
} from '@/lib/paymentMethods';
import { ArrowDownTrayIcon, MagnifyingGlassPlusIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useBranch } from '@/lib/branch';
import { flushSync } from 'react-dom';

type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
// Pay slips also have MISSING (online payment saved, no screenshot yet)
type RecordStatus = DepositStatus | 'MISSING';
type RecordType = '' | 'DEPOSIT' | 'CUSTOMIZED' | 'WALKIN';
type StatusFilter = '' | RecordStatus;
// Online payments without proof show under both Pending (to verify) and Rejected (cashier to-do)
const STATUS_QUERY: Record<StatusFilter, string> = {
  '': '',
  PENDING: 'PENDING,MISSING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED,MISSING',
  MISSING: 'MISSING',
};

interface Slip {
  id: string;
  file_url: string;
  bank_name: string;
  amount: number;
}

interface Deposit {
  type: 'DEPOSIT';
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

// One row of the Payments Record list: a bank deposit or an online pay slip
type RecordRow = Deposit | PaymentProof;
const isDeposit = (r: RecordRow): r is Deposit => r.type === 'DEPOSIT';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Pay Slip Not Attached', value: 'MISSING' },
];

const TYPE_OPTIONS: { label: string; value: RecordType }[] = [
  { label: 'All', value: '' },
  { label: 'Customized', value: 'CUSTOMIZED' },
  { label: 'Walk-in', value: 'WALKIN' },
];

// Period filter (Google "Any time" style): records from this day on
type Period = 'month' | '1m' | '2m' | '3m' | '6m' | '1y' | 'all';
const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 1 Month', value: '1m' },
  { label: 'Last 2 Months', value: '2m' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 1 Year', value: '1y' },
  { label: 'All Time', value: 'all' },
];
const PERIOD_MONTHS: Record<Period, number> = { month: 0, '1m': 1, '2m': 2, '3m': 3, '6m': 6, '1y': 12, all: 0 };
const periodStart = (period: Period): string | null => {
  if (period === 'all') return null;
  const now = new Date();
  const start = period === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - PERIOD_MONTHS[period], now.getDate());
  return start.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
};

const TYPE_LABEL: Record<string, string> = { DEPOSIT: 'Cash Deposit', CUSTOMIZED: 'Customized', WALKIN: 'Walk-in' };

const STATUS_BADGE: Record<RecordStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  MISSING: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const BANKS = ['Faysal Bank', 'Islami Bank', 'Jns Sportswear Bank'];
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PAGE_SIZE = 20;
// Each column fills the screen height whatever the number of entries; more rows scroll inside it
const COLUMN_HEIGHT = 'max(400px, calc(100vh - 190px))';

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

// "European Sports Karim Abad" -> "Karim Abad"
const shortBranchName = (name: string) => name.replace(/^European Sports\s+/i, '').trim();

// Slip photo with a yellow "<BRANCH> BRANCH" band added under it (2026-10-10), so HR can
// tell which shop it came from. The photo keeps its full size; the band is extra height,
// nothing is covered. Named e.g. LightHouse_DEP-0002_slip_1.jpg. Used by Download and Share.
// Branch unknown -> the original photo. Throws if the image can't be read.
const makeBandedSlip = async (url: string, name: string, branchName: string | null): Promise<File> => {
  const safeName = name.replace(/[^A-Za-z0-9_-]/g, '_');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const original = await response.blob();
  if (!branchName) return new File([original], `${safeName}.jpg`, { type: original.type || 'image/jpeg' });

  const branch = shortBranchName(branchName);
  const photo = await createImageBitmap(original);
  const { width, height } = photo;

  const bandHeight = Math.max(40, Math.round(width * 0.07));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height + bandHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(photo, 0, 0);
  photo.close();
  ctx.fillStyle = '#FFD01F'; // theme yellow (regal-yellow)
  ctx.fillRect(0, height, width, bandHeight);

  // LIGHT HOUSE BRANCH / KARIMABAD BRANCH (Karimabad is written as one word)
  const label = `${branch.toUpperCase().replace(/\s+/g, ' ').replace('KARIM ABAD', 'KARIMABAD')} BRANCH`;
  let fontSize = Math.round(bandHeight * 0.5);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  // Shrink to fit narrow (portrait) photos
  while (fontSize > 10 && ctx.measureText(label).width > width * 0.92) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  }
  ctx.fillStyle = '#000000'; // black text, like the yellow buttons (regal-black)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height + bandHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not create image');
  return new File([blob], `${branch.replace(/[^A-Za-z0-9]/g, '')}_${safeName}.jpg`, { type: 'image/jpeg' });
};

// Download the slip with the branch band.
// Branch unknown or the image can't be read -> plain download as before.
const downloadWithBranchBand = async (url: string, name: string, branchName: string | null) => {
  const fallback = () => {
    window.location.href = downloadUrl(url, name);
  };
  if (!branchName) {
    fallback();
    return;
  }
  try {
    const file = await makeBandedSlip(url, name, branchName);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  } catch (error) {
    console.error('Branch band download failed, downloading original:', error);
    fallback();
  }
};

const ShareButton = ({ busy, onShare }: { busy: boolean; onShare: () => void }) => (
  <button
    type="button"
    onClick={onShare}
    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-regal-yellow px-3 py-1.5 text-sm font-medium text-regal-black shadow-sm transition-colors hover:bg-yellow-200"
    title="Share on WhatsApp"
  >
    {busy ? <Spinner /> : <ShareIcon className="h-4 w-4" />}
    Share
  </button>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CashDepositsPage: React.FC = () => {
  const { showToast } = useToast();
  const currentBranch = useBranch(); // Branch name goes on downloaded slips

  const [role, setRole] = useState('');
  const [userLoaded, setUserLoaded] = useState(false); // list waits for the role (default filter)

  // Two columns (Sales View style): cash deposits left, online payments (customized + walk-in) right
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  // Start as loading: the lists wait for the user role first, so no "No records" flash
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [proofsLoading, setProofsLoading] = useState(true);
  // Filter inputs; applied at once (see applyFilters)
  const [typeFilter, setTypeFilter] = useState<RecordType>('');
  // Everyone starts on All; Pending / Rejected also list payments with no pay slip (STATUS_QUERY)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  // Smart search: a date (dd/mm or dd/mm/yyyy) or deposit / invoice no, bank, customer, name, amount
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false); // search + dropdowns open on the Search button
  const [period, setPeriod] = useState<Period>('month'); // applies at once, like Google
  const [applied, setApplied] = useState<{ type: RecordType; status: StatusFilter; search: string }>({
    type: '',
    status: '',
    search: '',
  });
  const [depositPage, setDepositPage] = useState(1);
  const [depositTotal, setDepositTotal] = useState({ items: 0, pages: 0 });
  const [proofPage, setProofPage] = useState(1);
  const [proofTotal, setProofTotal] = useState({ items: 0, pages: 0 });

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
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  // Pay slips picked in the panel: previewed first, uploaded on "Upload Pay Slip"
  const [newSlips, setNewSlips] = useState<{ file: File; url: string }[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  // Share: slip URL being prepared, and photos already made (a second tap shares at once)
  const [sharingUrl, setSharingUrl] = useState<string | null>(null);
  const sharedFiles = useRef(new Map<string, File>());
  const shareBusy = useRef(false);

  const canReview = role === 'admin' || role === 'sales';
  // Everyone on the page (admin / cashier / sales) can add and fix deposits (2026-10-13)
  const canEdit = (d: Deposit) => d.status !== 'APPROVED';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setRole(data.user?.role || '');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setUserLoaded(true);
      }
    };
    fetchUser();
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (applied.status) params.append('status_filter', STATUS_QUERY[applied.status]);
    if (applied.search) params.append('search', applied.search);
    const fromDate = periodStart(period);
    if (fromDate) params.append('from_date', fromDate);
    return params;
  }, [applied, period]);

  // Filters apply at once (no Fetch button): dropdowns on change, search on Enter
  // or when typing stops
  const applyFilters = useCallback((patch: Partial<typeof applied>) => {
    setApplied((prev) => ({ ...prev, ...patch }));
    setDepositPage(1);
    setProofPage(1);
  }, []);

  useEffect(() => {
    const value = search.trim();
    if (value === applied.search) return;
    const timer = setTimeout(() => applyFilters({ search: value }), 500);
    return () => clearTimeout(timer);
  }, [search, applied.search, applyFilters]);

  // One column's page: DEPOSIT, or PROOF (customized + walk-in) / one of them
  const fetchRecords = useCallback(async (type: string, page: number) => {
    try {
      const params = buildFilterParams();
      params.append('type_filter', type);
      params.append('page', page.toString());
      params.append('limit', PAGE_SIZE.toString());
      const response = await fetch(`/api/payments-record?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to fetch payments record', 'error');
        return null;
      }
      return { rows: (data.data || []) as RecordRow[], items: data.total || 0, pages: data.totalPages || 0 };
    } catch (error) {
      console.error('Error fetching payments record:', error);
      showToast('Failed to fetch payments record', 'error');
      return null;
    }
  }, [buildFilterParams, showToast]);

  const fetchDepositList = useCallback(async () => {
    setDepositsLoading(true);
    const result = await fetchRecords('DEPOSIT', depositPage);
    if (result) {
      setDeposits(result.rows.filter(isDeposit));
      setDepositTotal({ items: result.items, pages: result.pages });
    }
    setDepositsLoading(false);
  }, [fetchRecords, depositPage]);

  const fetchProofList = useCallback(async () => {
    setProofsLoading(true);
    const result = await fetchRecords(applied.type || 'PROOF', proofPage);
    if (result) {
      setProofs(result.rows.filter((r): r is PaymentProof => !isDeposit(r)));
      setProofTotal({ items: result.items, pages: result.pages });
    }
    setProofsLoading(false);
  }, [fetchRecords, applied.type, proofPage]);

  useEffect(() => {
    if (userLoaded) fetchDepositList();
  }, [fetchDepositList, userLoaded]);

  useEffect(() => {
    if (userLoaded) fetchProofList();
  }, [fetchProofList, userLoaded]);

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
      // Show All (clear search) so the saved deposit is visible
      setStatusFilter('');
      setSearch('');
      if (applied.status === '' && !applied.search && depositPage === 1) {
        fetchDepositList();
      } else {
        setApplied((prev) => ({ ...prev, status: '', search: '' }));
        setDepositPage(1);
        setProofPage(1);
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

  const clearNewSlips = () => {
    setNewSlips((slips) => {
      slips.forEach((s) => URL.revokeObjectURL(s.url));
      return [];
    });
  };

  const openDetail = (d: RecordRow) => {
    clearNewSlips();
    setSelected(d);
    setIsPanelOpen(true);
    setRejectReason('');
    setShowRejectBox(false);
  };

  const closePanel = () => {
    if (reviewing || proofUploading) return;
    clearNewSlips();
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
    const deposit = isDeposit(selected);
    const label = deposit ? selected.deposit_no : `${selected.invoice_no} payment`;
    try {
      setReviewing(true);
      const response = await fetch(`/api/${deposit ? 'cash-deposits' : 'payment-proofs'}/${selected.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        ...(action === 'reject'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: rejectReason.trim() }) }
          : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || `Failed to ${action} ${label}`, 'error');
        return;
      }
      showToast(
        action === 'approve'
          ? `${label} approved`
          : deposit ? `${label} rejected` : `${label} rejected - follow up with the customer`,
        'success'
      );
      setIsPanelOpen(false);
      setTimeout(() => setSelected(null), 300);
      if (deposit) fetchDepositList();
      else fetchProofList();
      window.dispatchEvent(new Event(deposit ? CASH_DEPOSITS_CHANGED : PAYMENT_PROOFS_CHANGED));
    } catch (error) {
      console.error(`Error on ${action}:`, error);
      showToast(`Failed to ${action} ${label}`, 'error');
    } finally {
      setReviewing(false);
    }
  };

  // Pick pay slips: preview only, nothing is uploaded yet
  const pickSlips = (proof: PaymentProof, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const error = proofFilesError([...newSlips.map((s) => s.file), ...files], proof.images.length);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setNewSlips((slips) => [...slips, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const removeNewSlip = (index: number) => {
    setNewSlips((slips) => {
      URL.revokeObjectURL(slips[index].url);
      return slips.filter((_, i) => i !== index);
    });
  };

  // "Upload Pay Slip": send the picked pay slips (missing / pending / rejected -> pending)
  const uploadProof = async (proof: PaymentProof) => {
    if (!newSlips.length || proofUploading) return;
    try {
      setProofUploading(true);
      const updated = await uploadProofImages(proof.id, newSlips.map((s) => s.file));
      clearNewSlips();
      setSelected(updated);
      setProofs((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
      showToast('Pay slip attached', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Pay slip upload failed', 'error');
    } finally {
      setProofUploading(false);
    }
  };

  // Remove one screenshot (while missing / pending), confirmed first
  const removeProofImage = async (proof: PaymentProof, imageId: string) => {
    const result = await Swal.fire({
      title: 'Remove this pay slip?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it!',
    });
    if (!result.isConfirmed) return;
    try {
      setProofUploading(true);
      const updated = await uploadProofImages(proof.id, [], proof.images.filter((i) => i.id !== imageId).map((i) => i.id));
      setSelected(updated);
      setProofs((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove pay slip', 'error');
    } finally {
      setProofUploading(false);
    }
  };

  // Share the slip photo (with the branch band, no caption) through the phone / Windows
  // share menu: WhatsApp -> group -> Send. Needs HTTPS; on a computer WhatsApp shows
  // in the menu only when WhatsApp Desktop is installed.
  // Nothing on the page may re-render while the menu is open: a focus / DOM change
  // closes the Windows share box at once. So the spinner is cleared (flushSync) before
  // share() and the busy guard is a ref, not state.
  const shareSlip = async (url: string, name: string) => {
    if (shareBusy.current) return;
    shareBusy.current = true;
    try {
      let file = sharedFiles.current.get(url);
      if (!file) {
        setSharingUrl(url);
        try {
          file = await makeBandedSlip(url, name, currentBranch?.name ?? null);
          sharedFiles.current.set(url, file);
        } finally {
          flushSync(() => setSharingUrl(null));
        }
      }
      if (!navigator.canShare?.({ files: [file] })) {
        showToast('This browser cannot share photos. Use Download, then send it on WhatsApp.', 'info');
        return;
      }
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return; // share menu closed
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // Making the photo took too long for the browser; it is ready now
        showToast('Photo ready - tap Share again', 'info');
        return;
      }
      console.error('Slip share failed:', error);
      showToast('Could not share the slip', 'error');
    } finally {
      shareBusy.current = false;
    }
  };

  // Make the slip photos as soon as the panel opens, so Share opens the menu at once
  useEffect(() => {
    if (!selected) return;
    const urls = isDeposit(selected)
      ? selected.slips.map((s, i) => [s.file_url, `${selected.deposit_no}_slip_${i + 1}`])
      : selected.images.map((img, i) => [img.file_url, `${selected.invoice_no}_payment_${i + 1}`]);
    urls.forEach(([url, name]) => {
      if (sharedFiles.current.has(url)) return;
      makeBandedSlip(url, name, currentBranch?.name ?? null)
        .then((file) => sharedFiles.current.set(url, file))
        .catch(() => {}); // made again on Share
    });
  }, [selected, currentBranch]);

  // ---------- render ----------

  const cashOf = (d: Deposit) =>
    d.cash_from === d.cash_to ? formatDate(d.cash_from) : `${formatDate(d.cash_from)} – ${formatDate(d.cash_to)}`;

  return (
    <div className="p-2 py-5">
      <PageHeader title="Payments Record" />

      {/* Period: right under the heading, above everything else, separate from the search filters (Google "Any time" style) */}
      <div className="flex justify-end mb-2">
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as Period);
            setDepositPage(1);
            setProofPage(1);
          }}
          className="regal-input w-auto py-1.5 text-sm font-medium"
          aria-label="Period"
          title="Show records of this period"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Line 1: New Deposit + Search button (opens search + dropdowns, like View Customer Orders) */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => (showForm ? closeForm() : openNewForm())}
          className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
        >
          {showForm && !editing ? 'Cancel' : '+ New Deposit'}
        </button>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      </div>

      {/* Line 2: filters, shown on Search click; apply at once - no Fetch button */}
      {showSearch && (
        <div className="grid grid-cols-2 md:flex md:items-end gap-2 md:gap-4 mb-6">
          <div className="col-span-2 md:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: search.trim() })}
              autoFocus
              placeholder="Date (03/10), Deposit / Invoice No, Bank, Customer, Amount"
              className="regal-input w-full"
            />
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value as StatusFilter;
                setStatusFilter(value);
                applyFilters({ status: value });
              }}
              className="regal-input w-full"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Online Payment</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                const value = e.target.value as RecordType;
                setTypeFilter(value);
                applyFilters({ type: value });
              }}
              className="regal-input w-full"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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

      {/* Two columns (Sales View style): Cash Deposits left, Customized + Walk-in right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Cash Deposits */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            Cash Deposits <span className="text-sm font-normal text-gray-500">({depositTotal.items})</span>
          </h2>
          {depositsLoading ? (
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="bg-gray-200 rounded" style={{ height: COLUMN_HEIGHT }}></div>
            </div>
          ) : (
            <div className="overflow-auto border border-gray-200 rounded" style={{ height: COLUMN_HEIGHT }}>
              <table className="w-full min-w-[560px]">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-black font-semibold text-xs uppercase">
                    <th className="px-3 py-5 text-left w-12">S.No</th>
                    <th className="px-2 py-5 text-left">No</th>
                    <th className="px-2 py-5 text-left">Status</th>
                    <th className="px-2 py-5 text-left">Cash Of</th>
                    <th className="px-2 py-5 text-left">Amount</th>
                    <th className="px-2 py-5 text-left">By</th>
                    <th className="px-2 py-5 text-left">Date</th>
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
                      <td className="px-3 py-4 whitespace-nowrap">{(depositPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{d.deposit_no}</td>
                      <td className="px-2 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_BADGE[d.status]}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-2 py-4">{cashOf(d)}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{formatAmount(d.total_amount)}</td>
                      <td className="px-2 py-4">{d.submitted_by_name || 'N/A'}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{formatDate(d.deposit_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {deposits.length === 0 && <div className="text-center py-12 text-gray-500">No cash deposits found.</div>}
            </div>
          )}

          {depositTotal.pages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={depositPage}
                totalPages={depositTotal.pages}
                totalItems={depositTotal.items}
                pageSize={PAGE_SIZE}
                baseUrl="/cash-deposits"
                onPageChange={setDepositPage}
              />
            </div>
          )}
        </div>

        {/* Right - Online payments of Customized + Walk-in invoices */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            Customized &amp; Walk-in <span className="text-sm font-normal text-gray-500">({proofTotal.items})</span>
          </h2>
          {proofsLoading ? (
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="bg-gray-200 rounded" style={{ height: COLUMN_HEIGHT }}></div>
            </div>
          ) : (
            <div className="overflow-auto border border-gray-200 rounded" style={{ height: COLUMN_HEIGHT }}>
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-black font-semibold text-xs uppercase">
                    <th className="px-3 py-5 text-left w-12">S.No</th>
                    <th className="px-2 py-5 text-left">Type</th>
                    <th className="px-2 py-5 text-left">Invoice No</th>
                    <th className="px-2 py-5 text-left">Status</th>
                    <th className="px-2 py-5 text-left">Payment Method</th>
                    <th className="px-2 py-5 text-left">Amount</th>
                    <th className="px-2 py-5 text-left">By</th>
                    <th className="px-2 py-5 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proofs.map((d, index) => (
                    <tr
                      key={d.id}
                      onClick={() => openDetail(d)}
                      className="text-sm text-gray-900 transition-colors cursor-pointer hover:bg-gray-50"
                      title="Click to view details"
                    >
                      <td className="px-3 py-4 whitespace-nowrap">{(proofPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{TYPE_LABEL[d.type] || d.type}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{d.invoice_no}</td>
                      <td className="px-2 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_BADGE[d.status]}`}>
                          {d.status === 'MISSING' ? 'PAY SLIP NOT ATTACHED' : d.status}
                        </span>
                      </td>
                      {/* Payment method pill, same as Sales View */}
                      <td className="px-2 py-4 text-xs">
                        <span className="inline-block px-2 py-2 bg-gray-100 rounded capitalize whitespace-nowrap">{d.payment_method}</span>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap">{formatAmount(d.amount)}</td>
                      <td className="px-2 py-4">{d.recorded_by_name || 'N/A'}</td>
                      <td className="px-2 py-4 whitespace-nowrap">{d.payment_date ? formatDate(d.payment_date) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {proofs.length === 0 && <div className="text-center py-12 text-gray-500">No online payments found.</div>}
            </div>
          )}

          {proofTotal.pages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={proofPage}
                totalPages={proofTotal.pages}
                totalItems={proofTotal.items}
                pageSize={PAGE_SIZE}
                baseUrl="/cash-deposits"
                onPageChange={setProofPage}
              />
            </div>
          )}
        </div>
      </div>

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
              <h2 className="text-2xl font-semibold text-gray-900">{isDeposit(selected) ? 'Deposit Details' : 'Online Payment'}</h2>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">
                &times;
              </button>
            </div>

            {isDeposit(selected) ? (
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
                        <div className="flex gap-2">
                        <ShareButton busy={sharingUrl === s.file_url} onShare={() => shareSlip(s.file_url, `${selected.deposit_no}_slip_${index + 1}`)} />
                        <button
                          type="button"
                          onClick={() => downloadWithBranchBand(s.file_url, `${selected.deposit_no}_slip_${index + 1}`, currentBranch?.name ?? null)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-regal-yellow px-3 py-1.5 text-sm font-medium text-regal-black shadow-sm transition-colors hover:bg-yellow-200"
                          title={`Download ${selected.deposit_no} slip ${index + 1}`}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </button>
                        </div>
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
            ) : (
            <div className="p-6 space-y-4">
              {([
                ['Invoice No', selected.invoice_no],
                ['Customer', selected.customer_name || '-'],
                ['Method', <span key="m" className="capitalize">{selected.payment_method}</span>],
                ['Payment Date', selected.payment_date ? formatDate(selected.payment_date) : '-'],
              ] as [string, React.ReactNode][]).map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
                </div>
              ))}
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-sm font-semibold text-gray-900">Rs. {formatAmount(selected.amount)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${STATUS_BADGE[selected.status]}`}>
                  {selected.status === 'MISSING' ? 'PAY SLIP NOT ATTACHED' : selected.status}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Payment Taken By</span>
                <span className="text-sm font-medium text-gray-900 text-right">
                  {selected.recorded_by_name || '-'}
                  {selected.recorded_at && (
                    <span className="block text-xs font-normal text-gray-500">{formatDateTime(selected.recorded_at)}</span>
                  )}
                </span>
              </div>
              {selected.uploaded_by_name && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">Pay Slip Attached By</span>
                  <span className="text-sm font-medium text-gray-900 text-right">
                    {selected.uploaded_by_name}
                    {selected.uploaded_at && (
                      <span className="block text-xs font-normal text-gray-500">{formatDateTime(selected.uploaded_at)}</span>
                    )}
                  </span>
                </div>
              )}
              {(selected.status === 'APPROVED' || selected.status === 'REJECTED') && selected.reviewed_by_name && (
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
              {selected.status === 'REJECTED' && (
                <p className="text-xs text-gray-500">
                  Follow up with the customer for this payment.
                </p>
              )}

              {/* Screenshots: original URL (sharp text), click to zoom */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Pay Slip ({selected.images.length})</p>
                {selected.images.length === 0 && (
                  <p className="text-sm text-orange-700 mb-2">Pay slip not attached yet. Request it from the customer and attach it here.</p>
                )}
                <div className="space-y-3">
                  {selected.images.map((img, index) => (
                    <div key={img.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setZoomSrc(img.file_url)}
                        className="group relative block w-full bg-gray-50"
                        title="Click to zoom"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.file_url} alt={`Pay slip ${index + 1}`} className="h-56 w-full object-contain" />
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
                          Zoom
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500">
                          Pay Slip {index + 1} of {selected.images.length}
                        </p>
                        <div className="flex gap-2">
                          {selected.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => removeProofImage(selected, img.id)}
                              disabled={proofUploading || reviewing}
                              className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                          <ShareButton busy={sharingUrl === img.file_url} onShare={() => shareSlip(img.file_url, `${selected.invoice_no}_payment_${index + 1}`)} />
                          <button
                            type="button"
                            onClick={() => downloadWithBranchBand(img.file_url, `${selected.invoice_no}_payment_${index + 1}`, currentBranch?.name ?? null)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-regal-yellow px-3 py-1.5 text-sm font-medium text-regal-black shadow-sm transition-colors hover:bg-yellow-200"
                            title={`Download ${selected.invoice_no} pay slip ${index + 1}`}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selected.status !== 'APPROVED' && selected.images.length < MAX_PROOF_IMAGES && (
                  <div className="mt-3 space-y-3">
                    {/* Picked pay slips: preview before upload (✕ removes; none left = back to Attach) */}
                    {newSlips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newSlips.map((slip, index) => (
                          <div key={slip.url} className="relative h-24 w-24 rounded-lg border-2 border-regal-yellow overflow-hidden bg-gray-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slip.url}
                              alt={`New pay slip ${index + 1}`}
                              onClick={() => setZoomSrc(slip.url)}
                              className="h-full w-full object-cover cursor-pointer"
                            />
                            {!proofUploading && (
                              <button
                                type="button"
                                onClick={() => removeNewSlip(index)}
                                className="absolute top-0 right-0 bg-black/70 text-white text-xs leading-none px-1.5 py-1"
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {newSlips.length === 0 ? (
                      // Same button as before; picking only previews the slip
                      <label className="inline-flex items-center gap-2 regal-btn bg-regal-yellow text-regal-black cursor-pointer">
                        + Attach Pay Slip
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => pickSlips(selected, e)}
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => uploadProof(selected)}
                        disabled={proofUploading}
                        className="inline-flex items-center gap-2 regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {proofUploading ? (<><Spinner /> Uploading...</>) : 'Upload Pay Slip'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {canReview && (selected.status === 'PENDING' || selected.status === 'MISSING') && showRejectBox && (
                <div>
                  <label className="block text-sm font-medium mb-1">Reject Reason *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="regal-input w-full"
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. Amount not received in Easypaisa"
                    autoFocus
                  />
                </div>
              )}

              {canReview && (selected.status === 'PENDING' || selected.status === 'MISSING') && (
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
                        disabled={reviewing || proofUploading || selected.status !== 'PENDING'}
                        title={selected.status === 'MISSING' ? 'Attach the pay slip first' : undefined}
                        className="regal-btn bg-green-500 text-white flex-1 py-2 disabled:opacity-50"
                      >
                        {reviewing ? 'Please wait...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectBox(true)}
                        disabled={reviewing || proofUploading}
                        className="regal-btn bg-red-500 text-white flex-1 py-2 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {zoomSrc && <ImageZoomViewer src={zoomSrc} alt="Pay slip" onClose={() => setZoomSrc(null)} />}
    </div>
  );
};

export default CashDepositsPage;
